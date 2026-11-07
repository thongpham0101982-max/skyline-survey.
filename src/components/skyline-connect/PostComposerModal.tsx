"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Lightbulb,
  Bot,
  Users,
  BookOpen,
  MessageSquare,
  Upload,
  CheckCircle2,
  AlertCircle,
  Globe,
  Building2,
  FileText,
  Trash2,
  AtSign,
  UserPlus,
} from "lucide-react";

export interface ComposerInitialData {
  id?: string;
  postType?: "GENERAL" | "IDEA" | "AI_PRODUCT" | "PROJECT" | "EXPERIENCE";
  title?: string;
  summary?: string;
  content?: string;
  coverImageUrl?: string | null;
  visibility?: "SYSTEM" | "CAMPUS" | "GROUP";
  groupId?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subjectCodes?: string[];
  gradeLevels?: string[];
  purposeTags?: string[];
  tags?: string[];
  mentionedUserIds?: string[];
  problemStatement?: string;
  proposedSolution?: string;
  beneficiaries?: string;
  aiSupportStep?: string;
  feedbackQuestions?: string;
  usageCautionNote?: string;
  ideaStatus?: "NEW_PROPOSED" | "SEEKING_COLLABORATORS" | "PROJECT_OPENED";
  productName?: string;
  utilitySummary?: string;
  productUrl?: string;
  guideText?: string;
  version?: string;
  pricingType?: "FREE" | "PAID" | "FREEMIUM";
  accountRequirement?: "NONE" | "SCHOOL_EMAIL" | "PERSONAL_ACCOUNT" | "API_KEY";
  productStatus?: "TRIAL" | "READY" | "MAINTENANCE" | "DISCONTINUED";
  linkedIdeaId?: string;
  projectGoal?: string;
  neededRoles?: string[];
  projectStatus?: "SEEKING_COLLABORATORS" | "IN_PROGRESS" | "HAS_PRODUCT" | "PAUSED";
  attachments?: Array<{
    id?: string;
    fileName: string;
    safeFileName?: string;
    mimeType: string;
    fileSize: number;
    fileUrl: string;
    attachmentType?: "IMAGE" | "DOCUMENT" | "VIDEO_LINK" | "EXTERNAL_LINK";
  }>;
}

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
  initialData?: ComposerInitialData | null;
  catalogs?: {
    subjects?: Array<{ code: string; name: string }>;
    grades?: Array<{ code: string; name: string }>;
    purposes?: Array<{ code: string; name: string }>;
    groups?: Array<{ id: string; name: string; isMember?: boolean }>;
    teachers?: Array<{
      userId: string;
      teacherName: string;
      teacherCode: string;
      campusName?: string | null;
      subjectName?: string | null;
      email?: string | null;
    }>;
  };
}

export function PostComposerModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  catalogs,
}: PostComposerModalProps) {
  const [postType, setPostType] = useState<
    "GENERAL" | "IDEA" | "AI_PRODUCT" | "PROJECT" | "EXPERIENCE"
  >(initialData?.postType || "IDEA");

  const [title, setTitle] = useState(initialData?.title || "");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [visibility, setVisibility] = useState<"SYSTEM" | "CAMPUS" | "GROUP">(
    initialData?.visibility || "SYSTEM"
  );
  const [groupId, setGroupId] = useState(initialData?.groupId || "");
  const [subjectCodes, setSubjectCodes] = useState<string[]>(initialData?.subjectCodes || []);
  const [gradeLevels, setGradeLevels] = useState<string[]>(initialData?.gradeLevels || []);
  const [purposeTags, setPurposeTags] = useState<string[]>(initialData?.purposeTags || []);
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(", "));

  // Idea fields
  const [problemStatement, setProblemStatement] = useState(initialData?.problemStatement || "");
  const [beneficiaries, setBeneficiaries] = useState(initialData?.beneficiaries || "");
  const [aiSupportStep, setAiSupportStep] = useState(initialData?.aiSupportStep || "");
  const [feedbackQuestions, setFeedbackQuestions] = useState(initialData?.feedbackQuestions || "");
  const [usageCautionNote, setUsageCautionNote] = useState(initialData?.usageCautionNote || "");
  const [ideaStatus, setIdeaStatus] = useState<
    "NEW_PROPOSED" | "SEEKING_COLLABORATORS" | "PROJECT_OPENED"
  >(initialData?.ideaStatus || "NEW_PROPOSED");

  // AI Product fields
  const [productUrl, setProductUrl] = useState(initialData?.productUrl || "");
  const [guideText, setGuideText] = useState(initialData?.guideText || "");
  const [version, setVersion] = useState(initialData?.version || "1.0");
  const [pricingType, setPricingType] = useState<"FREE" | "PAID" | "FREEMIUM">(
    initialData?.pricingType || "FREE"
  );
  const [accountRequirement, setAccountRequirement] = useState<
    "NONE" | "SCHOOL_EMAIL" | "PERSONAL_ACCOUNT" | "API_KEY"
  >(initialData?.accountRequirement || "NONE");
  const [productStatus, setProductStatus] = useState<
    "TRIAL" | "READY" | "MAINTENANCE" | "DISCONTINUED"
  >(initialData?.productStatus || "READY");

  // Project fields
  const [projectGoal, setProjectGoal] = useState(initialData?.projectGoal || "");
  const [neededRolesInput, setNeededRolesInput] = useState(
    (initialData?.neededRoles || ["GV bộ môn", "Thiết kế học liệu AI"]).join(", ")
  );
  const [projectStatus, setProjectStatus] = useState<
    "SEEKING_COLLABORATORS" | "IN_PROGRESS" | "HAS_PRODUCT" | "PAUSED"
  >(initialData?.projectStatus || "SEEKING_COLLABORATORS");

  // @Mention / Tagging state
  const [taggedTeachers, setTaggedTeachers] = useState<
    Array<{
      userId: string;
      teacherName: string;
      teacherCode?: string;
      campusName?: string | null;
      subjectName?: string | null;
    }>
  >([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachments & revision note
  const [attachments, setAttachments] = useState<
    Array<{
      id?: string;
      fileName: string;
      safeFileName?: string;
      mimeType: string;
      fileSize: number;
      fileUrl: string;
      attachmentType?: "IMAGE" | "DOCUMENT" | "VIDEO_LINK" | "EXTERNAL_LINK";
    }>
  >(initialData?.attachments || []);
  const [changeNote, setChangeNote] = useState("");
  const [piiChecked, setPiiChecked] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPostType(initialData?.postType || "IDEA");
      setTitle(initialData?.title || "");
      setSummary(initialData?.summary || "");
      setContent(initialData?.content || "");
      setCoverImageUrl(initialData?.coverImageUrl || "");
      setVisibility(initialData?.visibility || "SYSTEM");
      setGroupId(initialData?.groupId || "");
      setSubjectCodes(initialData?.subjectCodes || []);
      setGradeLevels(initialData?.gradeLevels || []);
      setPurposeTags(initialData?.purposeTags || []);
      setTagsInput((initialData?.tags || []).join(", "));
      setProblemStatement(initialData?.problemStatement || "");
      setBeneficiaries(initialData?.beneficiaries || "");
      setAiSupportStep(initialData?.aiSupportStep || "");
      setFeedbackQuestions(initialData?.feedbackQuestions || "");
      setUsageCautionNote(initialData?.usageCautionNote || "");
      setIdeaStatus(initialData?.ideaStatus || "NEW_PROPOSED");
      setProductUrl(initialData?.productUrl || "");
      setGuideText(initialData?.guideText || "");
      setVersion(initialData?.version || "1.0");
      setPricingType(initialData?.pricingType || "FREE");
      setAccountRequirement(initialData?.accountRequirement || "NONE");
      setProductStatus(initialData?.productStatus || "READY");
      setProjectGoal(initialData?.projectGoal || "");
      setNeededRolesInput(
        (initialData?.neededRoles || ["GV bộ môn", "Thiết kế học liệu AI"]).join(", ")
      );
      setProjectStatus(initialData?.projectStatus || "SEEKING_COLLABORATORS");
      setAttachments(initialData?.attachments || []);
      setChangeNote("");
      setErrorMsg(null);
      setMentionQuery(null);
      setTagSearchInput("");
      setTagDropdownOpen(false);
      const initMentionIds = initialData?.mentionedUserIds || [];
      if (initMentionIds.length > 0 && catalogs?.teachers) {
        setTaggedTeachers(
          catalogs.teachers.filter((t) => initMentionIds.includes(t.userId))
        );
      } else {
        setTaggedTeachers([]);
      }
    }
  }, [isOpen, initialData, catalogs?.teachers]);

  if (!isOpen) return null;

  const allTeachers = catalogs?.teachers || [];
  const matchingInlineTeachers =
    mentionQuery !== null
      ? allTeachers
          .filter((t) => {
            const q = mentionQuery.trim().toLowerCase();
            if (!q) return true;
            return (
              t.teacherName.toLowerCase().includes(q) ||
              (t.teacherCode || "").toLowerCase().includes(q) ||
              (t.subjectName || "").toLowerCase().includes(q) ||
              (t.campusName || "").toLowerCase().includes(q)
            );
          })
          .slice(0, 6)
      : [];

  const matchingPickerTeachers = allTeachers
    .filter((t) => {
      if (taggedTeachers.some((sel) => sel.userId === t.userId)) return false;
      const q = tagSearchInput.trim().toLowerCase();
      if (!q) return true;
      return (
        t.teacherName.toLowerCase().includes(q) ||
        (t.teacherCode || "").toLowerCase().includes(q) ||
        (t.subjectName || "").toLowerCase().includes(q) ||
        (t.campusName || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const handleContentChangeWithMention = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1) {
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : " ";
      if (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIdx === 0) {
        const afterAt = textBeforeCursor.slice(lastAtIdx + 1);
        if (!afterAt.includes("\n") && afterAt.length <= 28) {
          setMentionQuery(afterAt);
          setMentionStartIndex(lastAtIdx);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  const handleSelectInlineMention = (teacher: {
    userId: string;
    teacherName: string;
    teacherCode?: string;
    campusName?: string | null;
    subjectName?: string | null;
  }) => {
    if (mentionStartIndex >= 0) {
      const el = contentTextareaRef.current;
      const cursorPos = el?.selectionStart ?? content.length;
      const before = content.slice(0, mentionStartIndex);
      const after = content.slice(cursorPos);
      const inserted = `@${teacher.teacherName} `;
      const nextText = `${before}${inserted}${after}`;
      setContent(nextText);
    } else {
      setContent((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}@${teacher.teacherName} `);
    }

    setTaggedTeachers((prev) =>
      prev.some((p) => p.userId === teacher.userId) ? prev : [...prev, teacher]
    );
    setMentionQuery(null);
    setTimeout(() => contentTextareaRef.current?.focus(), 20);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (attachments.length + files.length > 5) {
      setErrorMsg("Mỗi bài đăng đính kèm tối đa 5 tệp (ảnh <= 10MB, tài liệu <= 25MB).");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      const uploadedList = [...attachments];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/skyline-connect/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Tải tệp lên thất bại.");
        }
        uploadedList.push(data.attachment);
        if (!coverImageUrl && data.attachment.attachmentType === "IMAGE") {
          setCoverImageUrl(data.attachment.fileUrl);
        }
      }
      setAttachments(uploadedList);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi tải tệp lên.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleItemInArray = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSubmit = async (targetStatus: "PUBLISHED" | "DRAFT") => {
    setErrorMsg(null);
    if (!piiChecked) {
      setErrorMsg(
        "Vui lòng xác nhận ảnh hoặc minh chứng học sinh (nếu có) đã được che thông tin định danh cá nhân trước khi đăng."
      );
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const neededRoles = neededRolesInput
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createOrUpdatePost",
          id: initialData?.id,
          postType,
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          coverImageUrl: coverImageUrl.trim() || null,
          visibility,
          groupId: visibility === "GROUP" ? groupId : null,
          status: targetStatus,
          subjectCodes,
          gradeLevels,
          purposeTags,
          tags,
          mentionedUserIds: taggedTeachers.map((t) => t.userId),
          hasStudentDataPiiChecked: piiChecked,
          problemStatement: problemStatement.trim(),
          proposedSolution: content.trim(),
          beneficiaries: beneficiaries.trim(),
          aiSupportStep: aiSupportStep.trim(),
          feedbackQuestions: feedbackQuestions.trim(),
          usageCautionNote: usageCautionNote.trim(),
          ideaStatus,
          productName: title.trim(),
          utilitySummary: summary.trim(),
          productUrl: productUrl.trim(),
          guideText: guideText.trim(),
          version: version.trim() || "1.0",
          pricingType,
          accountRequirement,
          productStatus,
          linkedIdeaId: initialData?.linkedIdeaId,
          projectGoal: projectGoal.trim() || summary.trim() || content.trim(),
          neededRoles,
          projectStatus,
          attachments,
          changeNote: changeNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Không thể lưu bài đăng.");
      }

      onSuccess(json.post);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Đã xảy ra lỗi khi lưu bài đăng.");
    } finally {
      setSubmitting(false);
    }
  };

  const postTypeOptions = [
    {
      id: "IDEA" as const,
      label: "Ý tưởng dạy học",
      desc: "Đề xuất ý tưởng, tìm góp ý & cộng sự",
      icon: Lightbulb,
    },
    {
      id: "AI_PRODUCT" as const,
      label: "Sản phẩm AI",
      desc: "Công cụ, prompt, ứng dụng có thể dùng thử",
      icon: Bot,
    },
    {
      id: "PROJECT" as const,
      label: "Dự án hợp tác",
      desc: "Mời đồng nghiệp cùng phát triển",
      icon: Users,
    },
    {
      id: "EXPERIENCE" as const,
      label: "Học liệu & Trải nghiệm",
      desc: "Chia sẻ tài liệu, kinh nghiệm tiết dạy",
      icon: BookOpen,
    },
    {
      id: "GENERAL" as const,
      label: "Chia sẻ thông thường",
      desc: "Đăng nhanh suy nghĩ, câu hỏi ngắn",
      icon: MessageSquare,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slc-composer-title"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#123E4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#159EAA]/30 border border-[#5EEAD4]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#5EEAD4]" />
            </div>
            <div>
              <h2 id="slc-composer-title" className="text-base font-bold">
                {initialData?.id ? "Chỉnh sửa nội dung trên tường" : "Gắn ý tưởng & sản phẩm lên tường"}
              </h2>
              <p className="text-xs text-teal-100/85">
                Chia sẻ ý tưởng dạy học, sản phẩm AI, dự án hoặc học liệu cùng đồng nghiệp Sky-Line
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng trình soạn bài"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm text-slate-800">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Chọn loại bài đăng (Progressive Disclosure) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Loại nội dung chia sẻ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {postTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = postType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPostType(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? "bg-[#F0FDFA] border-[#159EAA] text-[#123E4A] shadow-2xs ring-1 ring-[#159EAA]"
                        : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-1.5 ${
                        active ? "text-[#159EAA]" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold leading-snug">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Phạm vi hiển thị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phạm vi hiển thị
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: "SYSTEM" as const, label: "Toàn hệ thống", icon: Globe },
                  { id: "CAMPUS" as const, label: "Cơ sở của tôi", icon: Building2 },
                  { id: "GROUP" as const, label: "Nhóm chuyên môn", icon: Users },
                ].map((v) => {
                  const VIcon = v.icon;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVisibility(v.id)}
                      className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        visibility === v.id
                          ? "bg-[#123E4A] text-white border-[#123E4A]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <VIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visibility === "GROUP" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn nhóm chuyên môn <span className="text-rose-600">*</span>
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-[#159EAA]"
                >
                  <option value="">-- Chọn nhóm bạn là thành viên --</option>
                  {(catalogs?.groups || [])
                    .filter((g) => g.isMember)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Tiêu đề & Tóm tắt (Không bắt buộc với Chia sẻ thông thường) */}
          {postType !== "GENERAL" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {postType === "AI_PRODUCT"
                    ? "Tên sản phẩm AI *"
                    : postType === "IDEA"
                    ? "Tiêu đề ý tưởng dạy học *"
                    : postType === "PROJECT"
                    ? "Tên dự án hợp tác *"
                    : "Tiêu đề học liệu / trải nghiệm *"}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Trò chơi học tập Đảo Tri Thức bằng AI, Trợ lý soạn câu hỏi theo mức độ..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#159EAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {postType === "AI_PRODUCT"
                    ? "Công dụng chính & giá trị mang lại *"
                    : "Tóm tắt ngắn gọn (hiển thị trên thẻ tường)"}
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Tóm tắt trong 1–2 câu về công dụng đối với học sinh hoặc giáo viên..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#159EAA]"
                />
              </div>
            </div>
          )}

          {/* 4. Nội dung chính + @Tag Giáo viên */}
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {postType === "IDEA"
                    ? "Giải pháp đề xuất & cách thực hiện *"
                    : postType === "GENERAL"
                    ? "Nội dung chia sẻ *"
                    : "Mô tả chi tiết & hướng dẫn áp dụng *"}
                </label>
                <span className="text-[11px] font-semibold text-[#159EAA]">
                  Mẹo: Gõ <strong>@</strong> để tag tên giáo viên
                </span>
              </div>

              {/* Floating @Mention Autocomplete Dropdown when typing @ in post body */}
              {mentionQuery !== null && matchingInlineTeachers.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-1.5 z-50 bg-white rounded-2xl border border-[#159EAA]/40 shadow-xl overflow-hidden max-w-md">
                  <div className="px-3 py-1.5 bg-[#F0FDFA] border-b border-[#99F6E4]/60 text-[11px] font-bold text-[#123E4A] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5 text-[#159EAA]" />
                      <span>Chọn giáo viên để nhắc tên (@Tag)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">↑↓ di chuyển • Enter chọn</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {matchingInlineTeachers.map((teacher, idx) => {
                      const active = idx === mentionSelectedIndex;
                      return (
                        <button
                          key={teacher.userId}
                          type="button"
                          onClick={() => handleSelectInlineMention(teacher)}
                          onMouseEnter={() => setMentionSelectedIndex(idx)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            active ? "bg-[#E6F4F5]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#123E4A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {(teacher.teacherName || "G").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {teacher.teacherName}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {[teacher.subjectName, teacher.campusName]
                                  .filter(Boolean)
                                  .join(" • ") || "Giáo viên Sky-Line"}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#159EAA] shrink-0">
                            @Tag
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                ref={contentTextareaRef}
                rows={4}
                value={content}
                onChange={handleContentChangeWithMention}
                onKeyDown={(e) => {
                  if (mentionQuery !== null && matchingInlineTeachers.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionSelectedIndex((p) => (p + 1) % matchingInlineTeachers.length);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionSelectedIndex(
                        (p) =>
                          (p - 1 + matchingInlineTeachers.length) % matchingInlineTeachers.length
                      );
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      const chosen =
                        matchingInlineTeachers[mentionSelectedIndex] ||
                        matchingInlineTeachers[0];
                      if (chosen) handleSelectInlineMention(chosen);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setMentionQuery(null);
                      return;
                    }
                  }
                }}
                placeholder="Thầy/Cô muốn chia sẻ điều gì? Gõ @ để nhắc tên đồng nghiệp, mô tả quy trình thực hiện, prompt mẫu hoặc kinh nghiệm thực tế..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm leading-relaxed focus:outline-none focus:border-[#159EAA]"
              />
            </div>

            {/* Facebook-style "Gắn thẻ đồng nghiệp (@Tag giáo viên)" Bar */}
            <div className="p-3 rounded-xl bg-[#F0FDFA]/70 border border-[#99F6E4] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#123E4A]">
                  <UserPlus className="w-4 h-4 text-[#159EAA]" />
                  <span>Gắn thẻ đồng nghiệp (@Tag giáo viên)</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    — Giáo viên được tag sẽ nhận Notification ngay
                  </span>
                </div>
              </div>

              {/* Selected Teacher Chips */}
              {taggedTeachers.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {taggedTeachers.map((t) => (
                    <span
                      key={t.userId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#123E4A] border border-[#159EAA] text-xs font-bold shadow-2xs"
                    >
                      <span className="text-[#159EAA]">@</span>
                      <span>{t.teacherName}</span>
                      {t.campusName && (
                        <span className="text-[10px] font-normal text-slate-500">
                          ({t.campusName})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setTaggedTeachers((prev) =>
                            prev.filter((item) => item.userId !== t.userId)
                          )
                        }
                        className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                        aria-label={`Bỏ gắn thẻ ${t.teacherName}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search & Pick Teacher Input */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 focus-within:border-[#159EAA]">
                  <AtSign className="w-4 h-4 text-[#159EAA] shrink-0" />
                  <input
                    type="text"
                    value={tagSearchInput}
                    onFocus={() => setTagDropdownOpen(true)}
                    onChange={(e) => {
                      setTagSearchInput(e.target.value);
                      setTagDropdownOpen(true);
                    }}
                    placeholder="Nhập tên, mã GV, bộ môn hoặc cơ sở để chọn giáo viên cần @Tag..."
                    className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {tagDropdownOpen && (
                    <button
                      type="button"
                      onClick={() => setTagDropdownOpen(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      Đóng
                    </button>
                  )}
                </div>

                {tagDropdownOpen && matchingPickerTeachers.length > 0 && (
                  <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg divide-y divide-slate-100">
                    {matchingPickerTeachers.map((t) => (
                      <button
                        key={t.userId}
                        type="button"
                        onClick={() => {
                          setTaggedTeachers((prev) =>
                            prev.some((p) => p.userId === t.userId) ? prev : [...prev, t]
                          );
                          setTagSearchInput("");
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F0FDFA] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#123E4A] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {(t.teacherName || "G").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800">
                              {t.teacherName}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              {[t.subjectName, t.campusName].filter(Boolean).join(" • ")}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#159EAA] shrink-0">
                          + Gắn thẻ
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Trường chuyên biệt theo loại bài (Progressive Disclosure) */}
          {postType === "IDEA" && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123E4A] flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#D6A74A]" />
                  <span>Thông tin chuyên sâu cho Ý tưởng dạy học</span>
                </span>
                <select
                  value={ideaStatus}
                  onChange={(e) => setIdeaStatus(e.target.value as any)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold bg-white text-[#123E4A]"
                >
                  <option value="NEW_PROPOSED">Mới đề xuất</option>
                  <option value="SEEKING_COLLABORATORS">Đang tìm cộng sự</option>
                  <option value="PROJECT_OPENED">Đã mở dự án</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Vấn đề thực tế cần giải quyết
                  </label>
                  <input
                    type="text"
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    placeholder="Học sinh gặp khó khăn gì hoặc khâu nào tốn thời gian?"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Khâu AI hoặc công nghệ hỗ trợ
                  </label>
                  <input
                    type="text"
                    value={aiSupportStep}
                    onChange={(e) => setAiSupportStep(e.target.value)}
                    placeholder="Sinh câu hỏi phân hóa, phản hồi bài viết, tạo hình minh họa..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Câu hỏi mong đồng nghiệp góp ý
                  </label>
                  <input
                    type="text"
                    value={feedbackQuestions}
                    onChange={(e) => setFeedbackQuestions(e.target.value)}
                    placeholder="Ví dụ: Có thể điều chỉnh cho khối lớp khác như thế nào?"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Lưu ý thận trọng khi áp dụng với học sinh
                  </label>
                  <input
                    type="text"
                    value={usageCautionNote}
                    onChange={(e) => setUsageCautionNote(e.target.value)}
                    placeholder="Kiểm chứng nội dung AI, bảo mật thông tin học sinh..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {postType === "AI_PRODUCT" && (
            <div className="p-4 rounded-2xl bg-[#F0FDFA]/60 border border-[#99F6E4] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-[#123E4A] flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#159EAA]" />
                  <span>Cấu hình Sản phẩm AI & Liên kết Dùng thử</span>
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={productStatus}
                    onChange={(e) => setProductStatus(e.target.value as any)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold bg-white text-[#123E4A]"
                  >
                    <option value="READY">Sẵn sàng sử dụng</option>
                    <option value="TRIAL">Đang thử nghiệm</option>
                    <option value="MAINTENANCE">Đang bảo trì</option>
                    <option value="DISCONTINUED">Ngừng hỗ trợ</option>
                  </select>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="Phiên bản (1.0)"
                    className="w-24 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold bg-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Liên kết dùng thử (HTTPS bắt buộc)
                  </label>
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Yêu cầu tài khoản / Chi phí
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={pricingType}
                      onChange={(e) => setPricingType(e.target.value as any)}
                      className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-xs bg-white"
                    >
                      <option value="FREE">Miễn phí</option>
                      <option value="FREEMIUM">Giới hạn lượt</option>
                      <option value="PAID">Trả phí</option>
                    </select>
                    <select
                      value={accountRequirement}
                      onChange={(e) => setAccountRequirement(e.target.value as any)}
                      className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-xs bg-white"
                    >
                      <option value="NONE">Mở ngay</option>
                      <option value="SCHOOL_EMAIL">Email trường</option>
                      <option value="PERSONAL_ACCOUNT">TK cá nhân</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hướng dẫn sử dụng nhanh & lưu ý không nhập dữ liệu nhạy cảm của HS
                </label>
                <textarea
                  rows={2}
                  value={guideText}
                  onChange={(e) => setGuideText(e.target.value)}
                  placeholder="Các bước dùng thử nhanh trong 2 phút..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {postType === "PROJECT" && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123E4A] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#2878D9]" />
                  <span>Thông tin Dự án & Tuyển cộng sự</span>
                </span>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value as any)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold bg-white"
                >
                  <option value="SEEKING_COLLABORATORS">Đang tìm cộng sự</option>
                  <option value="IN_PROGRESS">Đang triển khai</option>
                  <option value="HAS_PRODUCT">Đã có sản phẩm</option>
                  <option value="PAUSED">Tạm dừng</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu đầu ra của dự án *
                  </label>
                  <input
                    type="text"
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                    placeholder="Ví dụ: Bộ 20 truyện tương tác AI cho học sinh Tiểu học..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò cộng sự cần tìm (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={neededRolesInput}
                    onChange={(e) => setNeededRolesInput(e.target.value)}
                    placeholder="GV Tiếng Việt, Thiết kế minh họa AI, Phản biện sư phạm"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Danh mục Môn học, Khối lớp & Mục đích sử dụng */}
          {postType !== "GENERAL" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Khối lớp áp dụng
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      catalogs?.grades || [
                        { code: "MAM_NON", name: "Mầm non" },
                        { code: "TIEU_HOC", name: "Tiểu học (Khối 1–5)" },
                        { code: "THCS", name: "THCS (Khối 6–9)" },
                        { code: "THPT", name: "THPT (Khối 10–12)" },
                      ]
                    ).map((g) => {
                      const selected = gradeLevels.includes(g.code);
                      return (
                        <button
                          key={g.code}
                          type="button"
                          onClick={() => toggleItemInArray(gradeLevels, g.code, setGradeLevels)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            selected
                              ? "bg-[#159EAA] text-white border-[#159EAA]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Môn học / Lĩnh vực
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                    {(
                      catalogs?.subjects || [
                        { code: "TOAN", name: "Toán" },
                        { code: "NGU_VAN", name: "Ngữ văn / Tiếng Việt" },
                        { code: "TIENG_ANH", name: "Tiếng Anh" },
                        { code: "KHTN", name: "Khoa học tự nhiên" },
                        { code: "TIN_HOC", name: "Tin học & AI" },
                        { code: "LIEN_MON", name: "Liên môn / STEAM" },
                      ]
                    ).map((s) => {
                      const selected = subjectCodes.includes(s.code);
                      return (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => toggleItemInArray(subjectCodes, s.code, setSubjectCodes)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            selected
                              ? "bg-[#123E4A] text-white border-[#123E4A]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhãn chủ đề (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Trò chơi học tập, Bản đồ tư duy, Trợ lý soạn câu hỏi, Đánh giá thường xuyên..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* 7. Đính kèm tệp & Ảnh bìa */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold text-slate-700">
                  Ảnh minh họa & Tài liệu đính kèm ({attachments.length}/5)
                </div>
                <div className="text-[11px] text-slate-500">
                  Hỗ trợ ảnh (PNG/JPG/WEBP &le; 10MB) và tài liệu (PDF/DOCX/PPTX/XLSX &le; 25MB). Tệp tự động kế thừa quyền bài đăng.
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#159EAA] text-xs font-semibold text-[#123E4A] cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-[#159EAA]" />
                <span>{uploading ? "Đang tải lên..." : "Tải tệp lên"}</span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#159EAA]" />
                    <span className="truncate max-w-[180px] font-medium">{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {initialData?.id && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú chỉnh sửa (lưu vào lịch sử phiên bản bài viết)
              </label>
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Cập nhật hướng dẫn dùng thử, bổ sung câu hỏi theo góp ý của đồng nghiệp..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          )}

          {/* 8. Cam kết bảo vệ dữ liệu học sinh */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] cursor-pointer">
            <input
              type="checkbox"
              checked={piiChecked}
              onChange={(e) => setPiiChecked(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#159EAA] focus:ring-[#159EAA]"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              Tôi xác nhận nội dung, ảnh chụp màn hình và tài liệu đính kèm đã được xử lý che thông tin cá nhân định danh của học sinh (nếu có) theo quy định an toàn dữ liệu trường học.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Lưu nháp
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? "Đang xử lý..."
                  : initialData?.id
                  ? "Cập nhật bài đăng"
                  : "Gắn lên tường"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
