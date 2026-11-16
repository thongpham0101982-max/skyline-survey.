"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Puzzle,
  Search,
  Database,
  Plus,
  Download,
  Copy,
  Check,
  Bookmark,
  CheckCircle2,
  MessageSquare,
  Play,
  GitFork,
  History,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Edit3,
  Trash2,
  RotateCcw,
  Eye,
  X,
  FileText,
  Sparkles,
  Layers,
  Award,
} from "lucide-react";

interface SkillsRepositoryViewProps {
  mode: "CATALOG" | "MY_CONTRIBUTIONS" | "SAVED" | "REVIEW_QUEUE";
  catalogs: any;
  currentUser: any;
  myPosts?: any[];
  savedPosts?: any[];
  onOpenSsmBuilder: () => void;
  onOpenSkillComposer: (skillToEdit?: any, skillToFork?: any) => void;
  onOpenSkillRunner: (skill: any) => void;
  onOpenPostComposer?: (initial?: any) => void;
  onShowToast: (msg: string) => void;
  onRefreshWall?: () => void;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  PENDING_REVIEW: {
    label: "Chờ duyệt",
    cls: "bg-amber-50 text-[#D97706] border-amber-200",
  },
  NEEDS_REVISION: {
    label: "Cần chỉnh sửa",
    cls: "bg-rose-50 text-[#E11D48] border-rose-200",
  },
  APPROVED: {
    label: "Được duyệt",
    cls: "bg-teal-50 text-[#00736E] border-teal-200",
  },
  PUBLISHED: {
    label: "Phát hành",
    cls: "bg-emerald-50 text-[#059669] border-emerald-200",
  },
  ARCHIVED: {
    label: "Lưu trữ",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
  },
  DELETED: {
    label: "Đã xóa (Có thể khôi phục)",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export function SkillsRepositoryView({
  mode,
  catalogs,
  currentUser,
  myPosts = [],
  savedPosts = [],
  onOpenSsmBuilder,
  onOpenSkillComposer,
  onOpenSkillRunner,
  onOpenPostComposer,
  onShowToast,
  onRefreshWall,
}: SkillsRepositoryViewProps) {
  const [search, setSearch] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [workCategory, setWorkCategory] = useState("ALL");
  const [visibility, setVisibility] = useState("ALL");
  const [sort, setSort] = useState<"NEWEST" | "MOST_APPLIED" | "MOST_DOWNLOADED">("NEWEST");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, total: 0, totalPages: 1 });
  const [workCategories, setWorkCategories] = useState<any[]>(
    catalogs?.skillWorkCategories || []
  );

  // Selected Skill Detail Drawer/Modal
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [skillDetail, setSkillDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Applied confirmation modal state
  const [appliedModalSkill, setAppliedModalSkill] = useState<any | null>(null);
  const [appliedClassLabel, setAppliedClassLabel] = useState("");
  const [appliedFeedback, setAppliedFeedback] = useState("");
  const [submittingApplied, setSubmittingApplied] = useState(false);

  // Department Working Session Skill Update state (Cập nhật Skill từ phiên làm việc Tổ chuyên môn)
  const [showSessionUpdateForm, setShowSessionUpdateForm] = useState(false);
  const [sessionType, setSessionType] = useState<string>("SHCM_DINH_KY");
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [sessionTestedClasses, setSessionTestedClasses] = useState<string>("");
  const [sessionObservations, setSessionObservations] = useState<string>("");
  const [sessionAgreedAdjustments, setSessionAgreedAdjustments] = useState<string>("");
  const [sessionParticipants, setSessionParticipants] = useState<
    Array<{ userId: string; name: string; role?: string }>
  >([]);
  const [sessionEditedPrompt, setSessionEditedPrompt] = useState<string>("");
  const [sessionEditedOutputStructure, setSessionEditedOutputStructure] = useState<string>("");
  const [submittingSessionUpdate, setSubmittingSessionUpdate] = useState(false);

  // Review & Governance Sub-tabs when mode === "REVIEW_QUEUE"
  const [govTab, setGovTab] = useState<
    "QUEUE" | "CATEGORIES" | "AI_USAGE" | "DATA_MAPPING"
  >("QUEUE");
  const [reviewDecisionNote, setReviewDecisionNote] = useState("");
  const [govStats, setGovStats] = useState<any>(null);
  const [dataMapping, setDataMapping] = useState<any[]>([]);
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        action: "skillsCatalog",
        viewMode: mode,
        sort,
        page: String(page),
        pageSize: "12",
      });
      if (search.trim()) qs.set("search", search.trim());
      if (subjectCode) qs.set("subjectCode", subjectCode);
      if (gradeLevel) qs.set("gradeLevel", gradeLevel);
      if (workCategory && workCategory !== "ALL") qs.set("workCategory", workCategory);
      if (visibility && visibility !== "ALL") qs.set("visibility", visibility);

      const res = await fetch(`/api/skyline-connect?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setSkills(json.items || []);
        setPagination(json.pagination || { page: 1, total: 0, totalPages: 1 });
        if (Array.isArray(json.workCategories) && json.workCategories.length > 0) {
          setWorkCategories(json.workCategories);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [mode, search, subjectCode, gradeLevel, workCategory, visibility, sort, page]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (mode === "REVIEW_QUEUE") {
      fetch("/api/skyline-connect?action=skillGovernanceStats")
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setGovStats(d);
        })
        .catch(() => {});
      fetch("/api/skyline-connect?action=dataMappingReport")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.mapping)) setDataMapping(d.mapping);
        })
        .catch(() => {});
    }
  }, [mode]);

  const openSkillDetail = async (skillId: string) => {
    setSelectedSkillId(skillId);
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/skyline-connect?action=skillDetail&skillId=${encodeURIComponent(skillId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tải chi tiết Skill.");
      setSkillDetail(json);
      setShowSessionUpdateForm(false);
      const sk = json?.skill;
      setSessionTitle(
        `SHCM Tổ ${sk?.subjectName || "chuyên môn"} — Rút kinh nghiệm & nâng cấp ${
          sk?.topicName || sk?.title || "Skill"
        }`
      );
      setSessionTestedClasses("");
      setSessionObservations("");
      setSessionAgreedAdjustments("");
      setSessionParticipants([]);
      setSessionEditedPrompt("");
      setSessionEditedOutputStructure("");
    } catch (err: any) {
      onShowToast(err?.message || "Không thể mở chi tiết Skill.");
      setSelectedSkillId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyInstruction = (skill: any) => {
    const textToCopy = [
      `# SKILL MÔN HỌC: ${skill.title} (v${skill.currentVersion})`,
      `## Mục đích (Giúp làm gì)\n${skill.purpose || skill.summary}`,
      `## Hướng dẫn AI (System Instruction)\n${skill.aiInstruction}`,
      `## Cấu trúc đầu ra\n${skill.outputStructure}`,
      `## Yêu cầu mẫu\n${skill.samplePrompt}`,
    ].join("\n\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedPrompt(true);
    onShowToast("Đã sao chép hướng dẫn Skill vào bộ nhớ tạm!");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleToggleSaveSkill = async (skill: any) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleSave",
          targetType: "SKILL",
          targetId: skill.id,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onShowToast(json.isSaved ? "Đã lưu Skill vào mục Đã lưu." : "Đã bỏ lưu Skill.");
        fetchSkills();
        if (skillDetail?.skill?.id === skill.id) {
          setSkillDetail({
            ...skillDetail,
            skill: { ...skillDetail.skill, isSaved: json.isSaved },
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitApplied = async () => {
    if (!appliedModalSkill) return;
    setSubmittingApplied(true);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmApplied",
          skillId: appliedModalSkill.id,
          postId: appliedModalSkill.postId || undefined,
          classLabel: appliedClassLabel,
          feedback: appliedFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onShowToast("Đã ghi nhận xác nhận 'Đã áp dụng' thực tế!");
      setAppliedModalSkill(null);
      setAppliedClassLabel("");
      setAppliedFeedback("");
      fetchSkills();
      if (selectedSkillId) openSkillDetail(selectedSkillId);
    } catch (err: any) {
      onShowToast(err?.message || "Không thể ghi nhận Đã áp dụng.");
    } finally {
      setSubmittingApplied(false);
    }
  };

  const handleSubmitDepartmentSessionUpdate = async (
    submitMode: "DRAFT" | "PENDING_REVIEW" | "PUBLISH_NOW"
  ) => {
    if (!skillDetail?.skill?.id) return;
    if (!sessionTitle.trim() || !sessionAgreedAdjustments.trim()) {
      onShowToast(
        "Vui lòng nhập Tên phiên làm việc Tổ chuyên môn và Nội dung thống nhất điều chỉnh Skill."
      );
      return;
    }
    setSubmittingSessionUpdate(true);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "departmentSessionSkillUpdate",
          skillId: skillDetail.skill.id,
          sessionType,
          sessionTitle: sessionTitle.trim(),
          testedClassesSummary: sessionTestedClasses.trim(),
          classroomObservations: sessionObservations.trim(),
          agreedAdjustments: sessionAgreedAdjustments.trim(),
          participatingTeachers: sessionParticipants,
          updatedAiSystemPrompt: sessionEditedPrompt.trim() || undefined,
          updatedOutputStructure: sessionEditedOutputStructure.trim() || undefined,
          submitMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Không thể cập nhật phiên bản Skill từ phiên làm việc.");
      }
      const verStr = json?.versionRecord?.version || "mới";
      onShowToast(
        submitMode === "PUBLISH_NOW"
          ? `Đã cập nhật và phát hành chính thức Skill v${verStr} từ phiên làm việc Tổ chuyên môn!`
          : `Đã ghi nhận biên bản phiên làm việc Tổ chuyên môn và tạo bản nâng cấp Skill v${verStr}!`
      );
      setShowSessionUpdateForm(false);
      fetchSkills();
      openSkillDetail(skillDetail.skill.id);
      if (onRefreshWall) onRefreshWall();
    } catch (err: any) {
      onShowToast(err?.message || "Lỗi khi cập nhật Skill từ phiên làm việc Tổ chuyên môn.");
    } finally {
      setSubmittingSessionUpdate(false);
    }
  };

  const handleReviewDecision = async (
    skillId: string,
    decision:
      | "APPROVE"
      | "REQUEST_REVISION"
      | "PUBLISH"
      | "ARCHIVE"
      | "SOFT_DELETE"
      | "RESTORE"
      | "ROLLBACK_VERSION",
    targetVersionId?: string
  ) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reviewSkillDecision",
          skillId,
          decision,
          feedback: reviewDecisionNote,
          targetVersionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onShowToast("Đã cập nhật trạng thái duyệt / phiên bản Skill!");
      setReviewDecisionNote("");
      fetchSkills();
      if (selectedSkillId === skillId) openSkillDetail(skillId);
      if (onRefreshWall) onRefreshWall();
    } catch (err: any) {
      onShowToast(err?.message || "Không thể thực hiện thao tác.");
    }
  };

  const handleSoftDeleteOrRestorePost = async (
    postId: string,
    modeAction: "DELETE" | "RESTORE"
  ) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "softDeleteOrRestorePost",
          postId,
          mode: modeAction,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onShowToast(
        modeAction === "DELETE"
          ? "Đã chuyển bài đăng vào thùng rác (có thể khôi phục)."
          : "Đã khôi phục bài đăng thành công!"
      );
      if (onRefreshWall) onRefreshWall();
    } catch (err: any) {
      onShowToast(err?.message || "Không thể cập nhật trạng thái bài đăng.");
    }
  };

  const handleCreateWorkCategory = async () => {
    if (!newCatCode.trim() || !newCatName.trim()) return;
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsertSkillWorkCategory",
          code: newCatCode,
          name: newCatName,
          description: newCatDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onShowToast("Đã lưu nhóm công việc Skill môn học!");
      setNewCatCode("");
      setNewCatName("");
      setNewCatDesc("");
      fetchSkills();
    } catch (err: any) {
      onShowToast(err?.message || "Không thể lưu nhóm công việc.");
    }
  };

  const subjects = catalogs?.subjects || [];
  const grades = catalogs?.grades || [];

  return (
    <div className="space-y-4">
      {/* Header Banner — Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-4 sm:p-5 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-[#003B3A]">
            {mode === "CATALOG"
              ? "Kho Skills môn học Sky-Line"
              : mode === "MY_CONTRIBUTIONS"
              ? "Đóng góp của tôi (Ý tưởng, Ứng dụng & Skills môn học)"
              : mode === "SAVED"
              ? "Kho lưu trữ đã lưu của tôi"
              : "Khu vực Duyệt chuyên môn, Phiên bản & Quản trị cộng đồng"}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {mode === "CATALOG"
              ? "Tổ chức theo danh mục môn học (Bộ GD&ĐT, CTQT, Môn đặc thù Sky-Line) và nhóm công việc sư phạm. Tách biệt tuyệt đối dữ liệu học sinh."
              : mode === "MY_CONTRIBUTIONS"
              ? "Quản lý bản nháp, theo dõi trạng thái duyệt, khôi phục bài đã xóa và tạo phiên bản cải tiến."
              : mode === "SAVED"
              ? "Các bài chia sẻ và Skills môn học Thầy/Cô đã đánh dấu lưu để sử dụng trong giảng dạy."
              : "Dành cho TTCM/QLCM, KT&ĐBCL và Quản trị: duyệt phát hành Skill, cấu hình danh mục, theo dõi AI và đối chiếu nguồn dữ liệu."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenSsmBuilder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Tạo Skill từ dữ liệu SSM</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSkillComposer(null, null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Đóng góp Skill môn học</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation for REVIEW_QUEUE mode */}
      {mode === "REVIEW_QUEUE" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "QUEUE" as const, label: "1. Hàng đợi duyệt & Phiên bản Skill" },
            { id: "CATEGORIES" as const, label: "2. Cấu hình nhóm công việc Skill" },
            { id: "AI_USAGE" as const, label: "3. Giám sát mức sử dụng & Chi phí AI" },
            {
              id: "DATA_MAPPING" as const,
              label: "4. Bảng Mapping Nguồn dữ liệu & API SSM",
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setGovTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                govTab === t.id
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Governance Sub-tabs: Categories / AI Usage / Data Mapping */}
      {mode === "REVIEW_QUEUE" && govTab === "CATEGORIES" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-4">
          <div className="text-xs font-bold text-[#003B3A]">
            Quản lý các nhóm công việc tìm kiếm trong Kho Skills môn học
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <input
              type="text"
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value)}
              placeholder="Mã nhóm (VD: STEAM_PROJECT)"
              className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Tên nhóm công việc hiển thị"
              className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Mô tả ngắn"
              className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleCreateWorkCategory}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
            >
              Thêm / Cập nhật nhóm
            </button>
          </div>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold">
                  <th className="py-2 px-3 font-semibold">Mã nhóm</th>
                  <th className="py-2 px-3 font-semibold">Tên nhóm công việc</th>
                  <th className="py-2 px-3 font-semibold">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {workCategories.map((c: any) => (
                  <tr key={c.code}>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#003B3A] font-semibold">
                      {c.code}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-2 px-3 text-slate-600">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === "REVIEW_QUEUE" && govTab === "AI_USAGE" && govStats && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-4">
          <div className="text-xs font-bold text-[#003B3A]">
            Theo dõi mức sử dụng, chi phí AI và nhật ký vận hành Skills môn học
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Tổng lượt chạy Skill AI</div>
              <div className="text-lg font-bold text-[#003B3A]">
                {govStats.aiUsage?.totalRuns ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">
                Thành công: {govStats.aiUsage?.completedRuns ?? 0} • Lỗi:{" "}
                {govStats.aiUsage?.failedRuns ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Tổng Tokens tiêu thụ</div>
              <div className="text-lg font-bold text-[#00736E]">
                {govStats.aiUsage?.totalTokens ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">
                Prompt: {govStats.aiUsage?.totalPromptTokens ?? 0} • Output:{" "}
                {govStats.aiUsage?.totalCompletionTokens ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Chi phí ước tính (USD)</div>
              <div className="text-lg font-bold text-[#059669]">
                {govStats.aiUsage?.totalEstimatedCostUsd ?? 0} USD
              </div>
              <div className="text-[10px] text-slate-500">
                Độ trễ TB: {govStats.aiUsage?.avgLatencyMs ?? 0} ms
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Dịch vụ AI hệ thống</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {govStats.aiConfigured ? "Gemini 2.5 Flash (Đã cấu hình)" : "Chưa cấu hình khóa AI"}
              </div>
              <div className="text-[10px] text-slate-500">Bảo mật khóa phía Server</div>
            </div>
          </div>
        </div>
      )}

      {mode === "REVIEW_QUEUE" && govTab === "DATA_MAPPING" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
          <div className="text-xs font-bold text-[#003B3A]">
            Bảng Mapping Nguồn dữ liệu, API, Trường dữ liệu, Quyền truy cập & Mức độ đầy đủ (Phần I.5)
          </div>
          <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold">
                  <th className="py-2.5 px-3 font-semibold">Nguồn dữ liệu</th>
                  <th className="py-2.5 px-3 font-semibold">Bảng Prisma & API</th>
                  <th className="py-2.5 px-3 font-semibold">Trường dữ liệu sử dụng</th>
                  <th className="py-2.5 px-3 font-semibold">Quyền truy cập</th>
                  <th className="py-2.5 px-3 font-semibold">Mức độ đầy đủ & Phần còn thiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {dataMapping.map((m: any) => (
                  <tr key={m.sourceId} className="align-top">
                    <td className="py-2.5 px-3 font-semibold text-[#003B3A]">
                      {m.domain}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      <div>Models: {(m.prismaModels || []).join(", ")}</div>
                      <div className="text-slate-500 mt-0.5">
                        API: {(m.existingApis || []).join(", ")}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {(m.fieldsUsed || []).join(", ")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{m.accessControl}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#059669]">{m.completeness}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.missingOrGaps}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter & Work Category Bar (shown in CATALOG, MY_CONTRIBUTIONS, SAVED, or REVIEW_QUEUE->QUEUE) */}
      {(mode !== "REVIEW_QUEUE" || govTab === "QUEUE") && (
        <>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3 shadow-2xs">
            {/* Work Categories Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setWorkCategory("ALL");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  workCategory === "ALL"
                    ? "bg-[#003B3A] text-white"
                    : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:bg-slate-100"
                }`}
              >
                Tất cả công việc
              </button>
              {workCategories.map((cat: any) => (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => {
                    setWorkCategory(cat.code);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    workCategory === cat.code
                      ? "bg-[#003B3A] text-white"
                      : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:bg-slate-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Granular Filters: Search, Subject, Grade, Scope, Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm tên Skill, chủ đề, tác giả..."
                  className="w-full rounded-xl border border-[#E2E8F0] pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] focus:outline-none"
                />
              </div>

              <select
                value={subjectCode}
                onChange={(e) => {
                  setSubjectCode(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs bg-white text-slate-800"
              >
                <option value="">Tất cả môn học (Bộ, CTQT & Đặc thù)</option>
                {subjects.map((s: any) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={gradeLevel}
                onChange={(e) => {
                  setGradeLevel(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs bg-white text-slate-800"
              >
                <option value="">Tất cả khối lớp</option>
                {grades.map((g: any) => (
                  <option key={g.code} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs bg-white text-slate-800"
              >
                <option value="ALL">Mọi phạm vi được phép xem</option>
                <option value="DEPARTMENT">Tổ chuyên môn</option>
                <option value="CAMPUS">Trong cơ sở</option>
                <option value="SYSTEM">Toàn hệ thống</option>
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs bg-white text-slate-800"
              >
                <option value="NEWEST">Sắp xếp: Mới cập nhật</option>
                <option value="MOST_APPLIED">Sắp xếp: Được áp dụng nhiều</option>
                <option value="MOST_DOWNLOADED">Sắp xếp: Tải nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* Skills Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#00A19A]" />
              <span>Đang tải danh sách Skills môn học...</span>
            </div>
          ) : skills.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center space-y-2.5">
              <Puzzle className="w-8 h-8 text-[#00A19A] mx-auto" />
              <div className="text-sm font-bold text-slate-900">
                Chưa có Skill môn học nào khớp với bộ lọc hiện tại
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Thầy/Cô có thể khởi tạo Skill môn học đầu tiên từ dữ liệu giảng dạy thực tế trên SSM hoặc đóng góp bằng biểu mẫu chuẩn.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenSsmBuilder}
                  className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
                >
                  Tạo Skill từ dữ liệu SSM
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSkillComposer(null, null)}
                  className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Tạo bằng biểu mẫu
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill) => {
                const st = STATUS_BADGES[skill.status] || STATUS_BADGES.DRAFT;
                return (
                  <div
                    key={skill.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs hover:border-[#00A19A]/60 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[10px] font-bold">
                            Skill môn học • v{skill.currentVersion}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${st.cls}`}
                          >
                            {st.label}
                          </span>
                          {skill.creationMode === "SSM_DATA" && (
                            <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4] text-[10px] font-semibold">
                              Từ căn cứ dữ liệu SSM
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {new Date(skill.updatedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSkillDetail(skill.id)}
                        className="text-left block w-full group cursor-pointer"
                      >
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#00736E] transition-colors">
                          {skill.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                          {skill.purpose || skill.summary}
                        </p>
                      </button>

                      {/* Metadata chips */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 pt-1">
                        <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] font-semibold text-[#003B3A]">
                          Tác giả: {skill.authorName}
                        </span>
                        {Array.isArray(skill.collaboratorNames) &&
                          skill.collaboratorNames.length > 0 && (
                            <span
                              className="px-2 py-0.5 rounded bg-[#F0FDFA] border border-[#99F6E4] font-semibold text-[#00736E] tabular-nums"
                              title={`Đồng đóng góp Tổ CM: ${skill.collaboratorNames.join(", ")}`}
                            >
                              +{skill.collaboratorNames.length} GV Tổ CM đồng đóng góp
                            </span>
                          )}
                        {Array.isArray(skill.departmentSessions) &&
                          skill.departmentSessions.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-semibold text-[#059669] tabular-nums">
                              {skill.departmentSessions.length} phiên làm việc Tổ CM
                            </span>
                          )}
                        {skill.topicName && (
                          <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                            Chủ đề: {skill.topicName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                          Phạm vi:{" "}
                          {skill.visibility === "DEPARTMENT"
                            ? "Tổ chuyên môn"
                            : skill.visibility === "CAMPUS"
                            ? "Trong cơ sở"
                            : "Toàn hệ thống"}
                        </span>
                      </div>

                      {skill.reviewFeedback && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                          <strong>Phản hồi người duyệt ({skill.reviewedByName}):</strong>{" "}
                          {skill.reviewFeedback}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 tabular-nums">
                        <span>Đã áp dụng: {skill.appliedCount || 0}</span>
                        <span>Lượt chạy: {skill.runCount || 0}</span>
                        <span>Tải về: {skill.downloadCount || 0}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openSkillDetail(skill.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          Xem ví dụ & Chi tiết
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyInstruction(skill)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                          title="Sao chép hướng dẫn AI"
                        >
                          Sao chép
                        </button>

                        <a
                          href={`/api/skyline-connect/skills/${skill.id}/download`}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                          title="Tải gói Skill (.zip an toàn)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải</span>
                        </a>

                        {/* Chỉ hiển thị "Dùng trên SSM" khi skill có khả năng thực thi đã được tích hợp và cấu hình đầy đủ */}
                        {skill.canExecuteOnSsm && (
                          <button
                            type="button"
                            onClick={() => onOpenSkillRunner(skill)}
                            className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-[#5EEAD4]" />
                            <span>Dùng trên SSM</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* My Posts & Soft-Deleted Restore Section when in MY_CONTRIBUTIONS */}
          {mode === "MY_CONTRIBUTIONS" && myPosts.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 mt-4">
              <div className="text-xs font-bold text-[#003B3A]">
                Bài chia sẻ Ý tưởng & Ứng dụng của tôi trên Tường chia sẻ ({myPosts.length})
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {myPosts.map((p: any) => (
                  <div
                    key={p.id}
                    className="py-2.5 flex items-center justify-between gap-3 flex-wrap text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        [{p.postType}] {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Trạng thái: {p.status} • Đã áp dụng: {p.appliedCount || 0} • Cập nhật:{" "}
                        {new Date(p.updatedAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onOpenPostComposer && p.status !== "DELETED" && (
                        <button
                          type="button"
                          onClick={() => onOpenPostComposer(p)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Sửa bài
                        </button>
                      )}
                      {p.status === "DELETED" ? (
                        <button
                          type="button"
                          onClick={() => handleSoftDeleteOrRestorePost(p.id, "RESTORE")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Khôi phục
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSoftDeleteOrRestorePost(p.id, "DELETE")}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====================================================================
          SKILL DETAIL MODAL (5-STEP FLOW + 13 METADATA + VERSION HISTORY)
          ==================================================================== */}
      {selectedSkillId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00A19A] text-white text-[10px] font-bold">
                    Skill môn học • v{skillDetail?.skill?.currentVersion || "1.0"}
                  </span>
                  <h2 className="text-base font-bold text-white">
                    {skillDetail?.skill?.title || "Đang tải chi tiết Skill..."}
                  </h2>
                </div>
                {skillDetail?.skill && (
                  <p className="text-xs text-teal-100/80 mt-0.5">
                    Tác giả: {skillDetail.skill.authorName}
                    {skillDetail.skill.collaboratorNames?.length > 0
                      ? ` • Đồng đóng góp: ${skillDetail.skill.collaboratorNames.join(", ")}`
                      : ""}
                    {skillDetail.skill.originalAuthorName
                      ? ` • Cải tiến từ Skill gốc của ${skillDetail.skill.originalAuthorName}`
                      : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSkillId(null);
                  setSkillDetail(null);
                }}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingDetail || !skillDetail?.skill ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Đang tải chi tiết 13 mục của Skill môn học...
                </div>
              ) : (
                <>
                  {/* Action Toolbar */}
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopyInstruction(skillDetail.skill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép hướng dẫn</span>
                      </button>

                      <a
                        href={`/api/skyline-connect/skills/${skillDetail.skill.id}/download`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-slate-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải gói Skill (.zip)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleToggleSaveSkill(skillDetail.skill)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          skillDetail.skill.isSaved
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-white border-[#E2E8F0] text-slate-700"
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{skillDetail.skill.isSaved ? "Đã lưu" : "Lưu Skill"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAppliedModalSkill(skillDetail.skill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#059669] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Đã áp dụng ({skillDetail.skill.appliedCount || 0})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const s = skillDetail.skill;
                          setSelectedSkillId(null);
                          onOpenSkillComposer(null, s);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#003B3A] cursor-pointer"
                      >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Tạo bản cải tiến</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(skillDetail.canContributeSessionUpdate ||
                        skillDetail.skill.canEdit) && (
                        <button
                          type="button"
                          onClick={() => setShowSessionUpdateForm((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00A19A] bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-xs font-bold text-[#003B3A] cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-[#00736E]" />
                          <span>
                            {showSessionUpdateForm
                              ? "Đóng biểu mẫu phiên Tổ CM"
                              : "Cập nhật từ phiên làm việc Tổ CM"}
                          </span>
                        </button>
                      )}

                      {skillDetail.skill.authorId === currentUser?.userId && (
                        <button
                          type="button"
                          onClick={() => {
                            const s = skillDetail.skill;
                            setSelectedSkillId(null);
                            onOpenSkillComposer(s, null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                      )}

                      {skillDetail.skill.canExecuteOnSsm && (
                        <button
                          type="button"
                          onClick={() => {
                            const s = skillDetail.skill;
                            setSelectedSkillId(null);
                            onOpenSkillRunner(s);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          <span>Dùng trên SSM</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ====================================================================
                      QUÁ TRÌNH UPDATE & CẬP NHẬT SKILL TỪ CÁC PHIÊN LÀM VIỆC CỦA GV TỔ CHUYÊN MÔN
                      ==================================================================== */}
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#003B3A] space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                          <span>
                            Quá trình cập nhật & phát triển Skill qua các phiên làm việc của GV Tổ chuyên môn
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10px] font-bold tabular-nums">
                            v{skillDetail.skill.currentVersion || "1.0"} •{" "}
                            {Array.isArray(skillDetail.departmentSessions)
                              ? skillDetail.departmentSessions.length
                              : 0}{" "}
                            phiên SHCM Tổ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Giáo viên cùng Tổ chuyên môn / cùng môn học có thể ghi nhận kết quả dạy thử nghiệm, sinh hoạt chuyên môn định kỳ và thống nhất nâng cấp Skill lên phiên bản mới (v1.1, v1.2...). Phiên bản đang phát hành vẫn hoạt động ổn định trong khi bản nâng cấp chờ duyệt.
                        </p>
                      </div>

                      {(skillDetail.canContributeSessionUpdate ||
                        skillDetail.skill.canEdit) && (
                        <button
                          type="button"
                          onClick={() => setShowSessionUpdateForm((prev) => !prev)}
                          className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer shrink-0"
                        >
                          {showSessionUpdateForm
                            ? "Thu gọn biểu mẫu"
                            : "+ Ghi nhận phiên làm việc Tổ CM & Nâng cấp Skill"}
                        </button>
                      )}
                    </div>

                    {/* Interactive Form to Submit Department Working Session Update */}
                    {showSessionUpdateForm && (
                      <div className="p-4 rounded-xl bg-white border border-[#00A19A]/50 space-y-3.5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                          <div className="text-xs font-bold text-[#003B3A]">
                            Biên bản cập nhật Skill từ phiên làm việc của GV Tổ chuyên môn
                          </div>
                          <span className="text-[11px] font-semibold text-[#00736E] tabular-nums">
                            Phiên bản hiện tại: v{skillDetail.skill.currentVersion} → Nâng cấp phiên bản mới
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Loại phiên làm việc Tổ chuyên môn
                            </label>
                            <select
                              value={sessionType}
                              onChange={(e) => setSessionType(e.target.value)}
                              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                            >
                              <option value="SHCM_DINH_KY">
                                Sinh hoạt Tổ chuyên môn định kỳ (SHCM)
                              </option>
                              <option value="DAY_THU_NGHIEM">
                                Rút kinh nghiệm sau tiết dạy thử nghiệm / dự giờ
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
                              Lớp / Khối đã dạy thực nghiệm hoặc đối sánh (ẩn danh HS)
                            </label>
                            <input
                              type="text"
                              value={sessionTestedClasses}
                              onChange={(e) => setSessionTestedClasses(e.target.value)}
                              placeholder="VD: Khối 11 (Lớp 11.1_CS1, 11.2_CS1)..."
                              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Tên phiên làm việc / Chuyên đề sinh hoạt Tổ chuyên môn *
                            </label>
                            <input
                              type="text"
                              value={sessionTitle}
                              onChange={(e) => setSessionTitle(e.target.value)}
                              placeholder="VD: SHCM Tổ Hóa học tuần 10 — Rút kinh nghiệm bài Saccharose và Maltose..."
                              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                            />
                          </div>
                        </div>

                        {/* Co-participating teachers from Department */}
                        {Array.isArray(catalogs?.teachers) && catalogs.teachers.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Giáo viên Tổ chuyên môn cùng tham gia phiên làm việc (tự động ghi nhận Đồng đóng góp):
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              {catalogs.teachers
                                .filter((t: any) => t.id !== currentUser?.userId)
                                .slice(0, 24)
                                .map((t: any) => {
                                  const selected = sessionParticipants.some(
                                    (p) => p.userId === t.id
                                  );
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        if (selected) {
                                          setSessionParticipants((prev) =>
                                            prev.filter((p) => p.userId !== t.id)
                                          );
                                        } else {
                                          setSessionParticipants((prev) => [
                                            ...prev,
                                            {
                                              userId: t.id,
                                              name: t.fullName || t.name,
                                              role: "GV Tổ chuyên môn tham gia SHCM",
                                            },
                                          ]);
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                                        selected
                                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                                          : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                                      }`}
                                    >
                                      {selected ? "✓ " : "+ "}
                                      {t.fullName || t.name}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ghi nhận thực tế từ tiết dạy / Phản hồi của học sinh trên lớp (tùy chọn)
                          </label>
                          <textarea
                            rows={2}
                            value={sessionObservations}
                            onChange={(e) => setSessionObservations(e.target.value)}
                            placeholder="VD: Nhóm HS khá hoàn thành nhanh trong 10 phút nhưng nhóm trung bình còn lúng túng ở bước viết phương trình thủy phân..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700">
                            Nội dung Tổ chuyên môn thống nhất điều chỉnh & nâng cấp vào Skill *
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              "Bổ sung gợi ý bậc thang (scaffolding) 3 bước cho nhóm HS cần hỗ trợ",
                              "Rút gọn hoạt động khởi động còn 5 phút, tăng thời lượng luyện tập thực hành",
                              "Thêm bảng phân biệt nhanh các lỗi sai học thuật thường gặp",
                              "Tách phiếu nhiệm vụ thành 3 mức độ: Cơ bản — Vận dụng — Mở rộng",
                              "Chuẩn hóa bảng kiểm Rubric chấm nhanh tại lớp cho giáo viên",
                            ].map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() =>
                                  setSessionAgreedAdjustments((prev) =>
                                    prev.includes(chip)
                                      ? prev
                                      : prev.trim()
                                      ? `${prev.trim()}\n- ${chip}`
                                      : `- ${chip}`
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#CCFBF1] border border-[#99F6E4] text-[11px] font-semibold text-[#00736E] cursor-pointer"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={3}
                            value={sessionAgreedAdjustments}
                            onChange={(e) => setSessionAgreedAdjustments(e.target.value)}
                            placeholder="Nhập các điều chỉnh chuyên môn mà Tổ đã thống nhất để hệ thống tự động tích hợp vào phiên bản mới của Skill..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                          />
                        </div>

                        <details className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <summary className="text-xs font-semibold text-[#003B3A] cursor-pointer">
                            Tùy chỉnh trực tiếp Hướng dẫn AI (System Prompt) & Cấu trúc đầu ra cho phiên bản mới (tùy chọn)
                          </summary>
                          <div className="space-y-2.5 mt-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Hướng dẫn AI (Nếu để trống, hệ thống tự động tích hợp biên bản thống nhất của Tổ chuyên môn vào Prompt hiện tại)
                              </label>
                              <textarea
                                rows={4}
                                value={sessionEditedPrompt}
                                onChange={(e) => setSessionEditedPrompt(e.target.value)}
                                placeholder={skillDetail.skill.aiInstruction || ""}
                                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-slate-800 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Cấu trúc đầu ra cập nhật (tùy chọn)
                              </label>
                              <textarea
                                rows={2}
                                value={sessionEditedOutputStructure}
                                onChange={(e) =>
                                  setSessionEditedOutputStructure(e.target.value)
                                }
                                placeholder={skillDetail.skill.outputStructure || ""}
                                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                              />
                            </div>
                          </div>
                        </details>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9] flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowSessionUpdateForm(false)}
                            className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={submittingSessionUpdate}
                            onClick={() => handleSubmitDepartmentSessionUpdate("DRAFT")}
                            className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                          >
                            Lưu nháp phiên bản mới
                          </button>
                          <button
                            type="button"
                            disabled={submittingSessionUpdate}
                            onClick={() =>
                              handleSubmitDepartmentSessionUpdate("PENDING_REVIEW")
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
                          >
                            {submittingSessionUpdate
                              ? "Đang cập nhật..."
                              : "Ghi nhận phiên SHCM & Gửi duyệt bản mới"}
                          </button>
                          {skillDetail.canReview && (
                            <button
                              type="button"
                              disabled={submittingSessionUpdate}
                              onClick={() =>
                                handleSubmitDepartmentSessionUpdate("PUBLISH_NOW")
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Duyệt & Phát hành ngay (TTCM/QLCM)
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline of Recorded Department Working Sessions */}
                    {Array.isArray(skillDetail.departmentSessions) &&
                      skillDetail.departmentSessions.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-slate-700">
                            Nhật ký các phiên làm việc Tổ chuyên môn đã cập nhật vào Skill ({skillDetail.departmentSessions.length} phiên):
                          </div>
                          <div className="space-y-2">
                            {skillDetail.departmentSessions.map((ses: any, idx: number) => (
                              <div
                                key={ses.versionId || ses.sessionId || idx}
                                className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10px] font-bold tabular-nums">
                                      v{ses.version}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4] text-[10px] font-semibold">
                                      {ses.sessionTypeLabel || "Phiên làm việc Tổ chuyên môn"}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {ses.sessionTitle}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 tabular-nums">
                                    {ses.sessionDate
                                      ? new Date(ses.sessionDate).toLocaleDateString("vi-VN")
                                      : ""}{" "}
                                    • Người ghi nhận: {ses.recordedByName || ses.createdByName}
                                  </span>
                                </div>

                                {ses.testedClassesSummary && (
                                  <div className="text-[11px] text-slate-600">
                                    <strong>Lớp thực nghiệm / đối sánh:</strong>{" "}
                                    {ses.testedClassesSummary}
                                  </div>
                                )}

                                {ses.classroomObservations && (
                                  <div className="text-[11px] text-slate-600">
                                    <strong>Ghi nhận thực tế tiết dạy:</strong>{" "}
                                    {ses.classroomObservations}
                                  </div>
                                )}

                                <div className="text-xs text-slate-800 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9] whitespace-pre-wrap">
                                  <strong className="text-[#003B3A]">
                                    Thống nhất điều chỉnh của Tổ chuyên môn:
                                  </strong>{" "}
                                  {ses.agreedAdjustments}
                                </div>

                                {Array.isArray(ses.participatingTeachers) &&
                                  ses.participatingTeachers.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 pt-0.5">
                                      <span className="font-semibold">
                                        GV Tổ chuyên môn tham gia:
                                      </span>
                                      {ses.participatingTeachers.map((pt: any, pIdx: number) => (
                                        <span
                                          key={`${pt.userId}_${pIdx}`}
                                          className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700"
                                        >
                                          {pt.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* 5-Step Pedagogical Presentation Flow: Giúp làm gì -> Chuẩn bị gì -> Yêu cầu mẫu -> Kết quả minh họa -> Cách sử dụng */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
                      <div className="text-xs font-bold text-[#003B3A]">
                        1. Giúp làm gì (Mục đích sư phạm)
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">
                        {skillDetail.skill.stepByStepView?.whatItHelps ||
                          skillDetail.skill.purpose}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
                      <div className="text-xs font-bold text-[#003B3A]">
                        2. Chuẩn bị gì (Điều kiện & Đầu vào)
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">
                        {skillDetail.skill.stepByStepView?.whatToPrepare ||
                          skillDetail.skill.usageConditions}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <div className="text-xs font-bold text-[#00736E]">
                        3. Yêu cầu mẫu (Sample Input)
                      </div>
                      <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans">
                        {skillDetail.skill.samplePrompt || "Chưa có yêu cầu mẫu"}
                      </pre>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <div className="text-xs font-bold text-[#059669]">
                        4. Kết quả minh họa (Sample Output)
                      </div>
                      <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                        {skillDetail.skill.sampleOutput || "Chưa có kết quả minh họa"}
                      </pre>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                    <div className="text-xs font-bold text-[#003B3A]">
                      5. Cách sử dụng & Nền tảng tương thích (
                      {(skillDetail.skill.compatiblePlatforms || []).join(", ")})
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {skillDetail.skill.usageGuide || skillDetail.skill.workflowProcess}
                    </p>
                  </div>

                  {/* Full AI Instruction & Principles */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="text-xs font-bold text-slate-900">
                      Hướng dẫn AI (System Instruction) & Cấu trúc đầu ra
                    </div>
                    <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-lg border border-[#E2E8F0] whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {skillDetail.skill.aiInstruction}
                    </pre>
                    <div className="text-[11px] text-slate-600">
                      <strong>Nguyên tắc & Giới hạn:</strong>{" "}
                      {skillDetail.skill.principlesAndLimits}
                    </div>
                  </div>

                  {/* Reviewer / Manager Approval Panel (Section VIII) */}
                  {skillDetail.canReview && (
                    <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#00A19A]/50 space-y-3">
                      <div className="text-xs font-bold text-[#003B3A]">
                        Khu vực xét duyệt chuyên môn & Quản lý phát hành (TTCM / QLCM / KT&ĐBCL / Quản trị)
                      </div>
                      <textarea
                        rows={2}
                        value={reviewDecisionNote}
                        onChange={(e) => setReviewDecisionNote(e.target.value)}
                        placeholder="Nhập nhận xét chuyên môn hoặc yêu cầu chỉnh sửa cho tác giả..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs bg-white"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleReviewDecision(skillDetail.skill.id, "PUBLISH")
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-bold cursor-pointer"
                        >
                          Duyệt & Phát hành (Kèm bài giới thiệu trên Tường)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReviewDecision(skillDetail.skill.id, "APPROVE")
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#00736E] text-white text-xs font-semibold cursor-pointer"
                        >
                          Chấp thuận (Approved)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReviewDecision(skillDetail.skill.id, "REQUEST_REVISION")
                          }
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Yêu cầu chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReviewDecision(skillDetail.skill.id, "ARCHIVE")
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          Lưu trữ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Version History & Rollback */}
                  {Array.isArray(skillDetail.versions) &&
                    skillDetail.versions.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-[#003B3A]" />
                          <span>
                            Lịch sử phiên bản ({skillDetail.versions.length} phiên bản)
                          </span>
                        </div>
                        <div className="divide-y divide-[#F1F5F9] text-xs">
                          {skillDetail.versions.map((ver: any) => (
                            <div
                              key={ver.id}
                              className="py-2 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-[#003B3A] tabular-nums">
                                  v{ver.versionNumber}
                                </span>{" "}
                                <span className="text-slate-600">
                                  — {ver.changeLog || "Cập nhật"} ({ver.status})
                                </span>
                                {skillDetail.skill.publishedVersionId === ver.id && (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-emerald-50 text-[#059669] text-[10px] font-bold">
                                    Đang phát hành chính thức
                                  </span>
                                )}
                              </div>
                              {skillDetail.canReview &&
                                skillDetail.skill.publishedVersionId !== ver.id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewDecision(
                                        skillDetail.skill.id,
                                        "ROLLBACK_VERSION",
                                        ver.id
                                      )
                                    }
                                    className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-slate-50 text-[11px] font-semibold text-[#003B3A] cursor-pointer"
                                  >
                                    Quay về bản này
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL XÁC NHẬN "ĐÃ ÁP DỤNG" (KÈM PHẢN HỒI TÙY CHỌN)
          ==================================================================== */}
      {appliedModalSkill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Xác nhận Đã áp dụng Skill vào thực tế
              </h3>
              <button
                type="button"
                onClick={() => setAppliedModalSkill(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Skill: <strong>{appliedModalSkill.title}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp / Khối đã áp dụng (tùy chọn)
              </label>
              <input
                type="text"
                value={appliedClassLabel}
                onChange={(e) => setAppliedClassLabel(e.target.value)}
                placeholder="VD: Khối 8 / Lớp 8A1..."
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phản hồi / Góp ý thực tế sau khi áp dụng (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={appliedFeedback}
                onChange={(e) => setAppliedFeedback(e.target.value)}
                placeholder="Chia sẻ ngắn gọn hiệu quả hoặc điểm cần tinh chỉnh thêm..."
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAppliedModalSkill(null)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingApplied}
                onClick={handleSubmitApplied}
                className="px-4 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
              >
                {submittingApplied ? "Đang lưu..." : "Xác nhận Đã áp dụng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
