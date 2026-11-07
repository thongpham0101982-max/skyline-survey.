"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  Award,
  FileCheck2,
  Star,
  Flag,
  Settings,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  History,
  ExternalLink,
} from "lucide-react";

export default function AdminSkylineConnectPage() {
  const [activeTab, setActiveTab] = useState<
    "CONTENT" | "EVIDENCE" | "EXPERT" | "AWARDS" | "MODERATION" | "SYSTEM"
  >("CONTENT");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Evidence verification state
  const [verifyReasonMap, setVerifyReasonMap] = useState<Record<string, string>>({});

  // Expert evaluation form state
  const [expertTargetType, setExpertTargetType] = useState<"PRODUCT" | "IDEA">("PRODUCT");
  const [expertTargetId, setExpertTargetId] = useState("");
  const [expertPeriodId, setExpertPeriodId] = useState("GLOBAL");
  const [c1, setC1] = useState(5);
  const [c2, setC2] = useState(5);
  const [c3, setC3] = useState(5);
  const [expertComment, setExpertComment] = useState("");

  // Award Period creation state
  const [periodType, setPeriodType] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [monthNumber, setMonthNumber] = useState<number>(11);
  const [yearNumber, setYearNumber] = useState<number>(2026);
  const [academicYearName, setAcademicYearName] = useState("2026–2027");

  // Role assignment state
  const [roleUserId, setRoleUserId] = useState("");
  const [roleCode, setRoleCode] = useState("EXPERT_REVIEWER");
  const [roleScopeType, setRoleScopeType] = useState("SYSTEM");

  // Moderation conclusion state
  const [modConclusionMap, setModConclusionMap] = useState<Record<string, string>>({});
  const [modNoteMap, setModNoteMap] = useState<Record<string, string>>({});

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/skyline-connect?action=adminOverview");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Không thể tải dữ liệu Quản trị Sky-Line Connect.");
      }
      setData(json);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSetEditorialSpotlight = async (
    postId: string,
    rank: number | null,
    isPinned: boolean
  ) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adminAction",
        subAction: "SET_EDITORIAL_SPOTLIGHT",
        payload: {
          postId,
          editorialFeaturedRank: rank,
          isPinned,
          editorialLabel: rank ? `Dấu ấn sáng tạo tháng #${rank}` : null,
        },
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Đã cập nhật Dấu ấn sáng tạo tháng (tách biệt với danh hiệu giải thưởng)!");
      loadAdminData();
    } else {
      showToast(json.message || "Lỗi cập nhật.");
    }
  };

  const handleVerifyApplication = async (
    applicationId: string,
    decision: "VERIFIED" | "SUPPLEMENT_REQUESTED" | "REJECTED"
  ) => {
    const reason =
      verifyReasonMap[applicationId]?.trim() ||
      (decision === "VERIFIED"
        ? "Minh chứng áp dụng thực tế hợp lệ và đầy đủ"
        : "Đề nghị bổ sung thêm mô tả kết quả tiết dạy");
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verifyApplication",
        applicationId,
        decision,
        reason,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Đã cập nhật trạng thái xác nhận minh chứng áp dụng!");
      loadAdminData();
    } else {
      showToast(json.message || "Không thể duyệt minh chứng.");
    }
  };

  const handleSubmitExpertEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertTargetId) return;
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitExpertEvaluation",
        periodId: expertPeriodId || "GLOBAL",
        targetType: expertTargetType,
        targetId: expertTargetId,
        criterion1Score: c1,
        criterion2Score: c2,
        criterion3Score: c3,
        comments: expertComment.trim(),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Đã lưu phiếu chấm điểm chuyên môn độc lập (E)!");
      setExpertComment("");
      loadAdminData();
    } else {
      showToast(json.message || "Không thể gửi điểm chuyên môn.");
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adminAction",
        subAction: "CREATE_AWARD_PERIOD",
        payload: {
          periodType,
          monthNumber: periodType === "MONTHLY" ? monthNumber : null,
          yearNumber,
          academicYearName,
          audienceScope: "SYSTEM",
          audienceScopeId: "ALL",
        },
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Đã khởi tạo kỳ xét giải Bảng vàng mới!");
      loadAdminData();
    } else {
      showToast(json.message || "Không thể tạo kỳ xét giải.");
    }
  };

  const handleFinalizePeriod = async (periodId: string) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finalizePeriod",
        periodId,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(
        `Đã chốt chính thức kỳ Bảng vàng (${json.snapshotCount} bản ghi snapshot, ${json.badgeCount} huy hiệu vinh danh)!`
      );
      loadAdminData();
    } else {
      showToast(json.message || "Không thể chốt kỳ Bảng vàng.");
    }
  };

  const handleModerationAction = async (
    reportId: string,
    subAction: "START_REVIEW" | "TEMP_HIDE_SEVERE" | "CONCLUDE" | "RESOLVE_APPEAL"
  ) => {
    const conclusion = (modConclusionMap[reportId] || "NO_VIOLATION") as any;
    const conclusionNote =
      modNoteMap[reportId]?.trim() || "Đã rà soát theo quy định cộng đồng Sky-Line Connect";

    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reportAction",
        subAction,
        reportId,
        conclusion,
        conclusionNote,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Đã cập nhật kết luận xử lý báo cáo nội dung!");
      loadAdminData();
    } else {
      showToast(json.message || "Không thể xử lý báo cáo.");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleUserId) return;
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adminAction",
        subAction: "ASSIGN_ROLE",
        payload: {
          userId: roleUserId,
          role: roleCode,
          scopeType: roleScopeType,
          scopeId: "ALL",
        },
      }),
    });
    if (res.ok) {
      showToast("Đã phân quyền vai trò chuyên môn Sky-Line Connect!");
      loadAdminData();
    }
  };

  const handleToggleFeatureFlag = async (isEnabled: boolean, pilotMode: boolean) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adminAction",
        subAction: "UPDATE_FEATURE_CONFIG",
        payload: { isEnabled, pilotMode },
      }),
    });
    if (res.ok) {
      showToast("Đã cập nhật cấu hình Feature Flag Sky-Line Connect!");
      loadAdminData();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Đang tải trang Quản trị Sky-Line Connect...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <div className="text-sm font-bold text-slate-800">{errorMsg}</div>
      </div>
    );
  }

  const posts = data?.posts || [];
  const applications = data?.applications || [];
  const ideas = data?.ideas || [];
  const products = data?.products || [];
  const awardPeriods = data?.awardPeriods || [];
  const reports = data?.reports || [];
  const roleAssignments = data?.roleAssignments || [];
  const auditLogs = data?.auditLogs || [];
  const teachers = data?.teachers || [];
  const featureConfig = data?.featureConfig || { isEnabled: true, pilotMode: false };

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#003B3A] text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Masthead */}
      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#5EEAD4]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#003B3A]">
              Quản trị & Điều phối Sky-Line Connect
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý Dấu ấn sáng tạo tháng, xác nhận minh chứng áp dụng, chấm chuyên môn, chốt Bảng vàng có snapshot & nhật ký kiểm toán
            </p>
          </div>
        </div>

        <Link
          href="/teacher/skyline-connect"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold self-start"
        >
          <span>Mở Bức tường ý tưởng AI</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          {
            id: "CONTENT" as const,
            label: `Nội dung & Dấu ấn tháng (${posts.length})`,
            icon: Sparkles,
          },
          {
            id: "EVIDENCE" as const,
            label: `Duyệt minh chứng áp dụng (${applications.length})`,
            icon: FileCheck2,
          },
          {
            id: "EXPERT" as const,
            label: "Chấm điểm chuyên môn (E)",
            icon: Star,
          },
          {
            id: "AWARDS" as const,
            label: `Kỳ Bảng vàng & Chốt giải (${awardPeriods.length})`,
            icon: Award,
          },
          {
            id: "MODERATION" as const,
            label: `Kiểm duyệt & Phúc khảo (${reports.length})`,
            icon: Flag,
          },
          {
            id: "SYSTEM" as const,
            label: "Phân quyền, Feature Flag & Audit",
            icon: Settings,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. CONTENT & EDITORIAL SPOTLIGHT */}
      {activeTab === "CONTENT" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#003B3A]">
                Quản lý bài đăng & Chọn &quot;Dấu ấn sáng tạo tháng&quot;
              </h2>
              <p className="text-xs text-slate-500">
                Chọn 1 thẻ nổi bật chính (#1) và 2 thẻ phụ (#2, #3) trên đầu trang Bức tường ý tưởng AI. Việc ghim/chọn biên tập hoàn toàn tách biệt với danh hiệu Bảng vàng.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-3">Tiêu đề bài đăng</th>
                  <th className="py-3 px-3">Loại</th>
                  <th className="py-3 px-3">Tác giả & Cơ sở</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Chọn Dấu ấn sáng tạo tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-bold text-[#003B3A]">
                      <Link
                        href={`/teacher/skyline-connect/posts/${p.id}`}
                        className="hover:text-[#159EAA] hover:underline"
                      >
                        {p.title || "Chia sẻ chuyên môn"}
                      </Link>
                    </td>
                    <td className="py-3 px-3">{p.postType}</td>
                    <td className="py-3 px-3">
                      {p.authorName} ({p.campusName || "Sky-Line"})
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {[1, 2, 3].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSetEditorialSpotlight(p.id, r, true)}
                          className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                            p.editorialFeaturedRank === r
                              ? "bg-[#159EAA] text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Tiêu điểm #{r}
                        </button>
                      ))}
                      {p.editorialFeaturedRank && (
                        <button
                          type="button"
                          onClick={() => handleSetEditorialSpotlight(p.id, null, false)}
                          className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. EVIDENCE VERIFICATION */}
      {activeTab === "EVIDENCE" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A]">
              Xác nhận minh chứng áp dụng thực tế (Tính điểm U cho Sản phẩm AI)
            </h2>
            <p className="text-xs text-slate-500">
              Chỉ các báo cáo áp dụng ở trạng thái &quot;Đã xác nhận&quot; (VERIFIED) mới được tính vào số lượng GV áp dụng thực tế (a).
            </p>
          </div>

          <div className="space-y-3">
            {applications.map((app: any) => (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#003B3A]">{app.applicantName}</span>
                    <span className="text-slate-500">• {app.campusName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.verificationStatus === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : app.verificationStatus === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {app.verificationStatus}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    Môn / Công việc: {app.subjectOrTask} {app.gradeLevel ? `(${app.gradeLevel})` : ""}
                  </div>
                  <div className="text-slate-600">Cách áp dụng: {app.howApplied}</div>
                  <div className="text-slate-600">Kết quả quan sát: {app.observedResult}</div>
                  {app.evidenceText && (
                    <div className="text-[#00736E] font-medium">
                      Minh chứng: {app.evidenceText}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={verifyReasonMap[app.id] || ""}
                    onChange={(e) =>
                      setVerifyReasonMap({ ...verifyReasonMap, [app.id]: e.target.value })
                    }
                    placeholder="Nhận xét / lý do xác nhận..."
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs w-56"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyApplication(app.id, "VERIFIED")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    Xác nhận (VERIFIED)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyApplication(app.id, "SUPPLEMENT_REQUESTED")}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    Yêu cầu bổ sung
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyApplication(app.id, "REJECTED")}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}

            {applications.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                Chưa có hồ sơ minh chứng áp dụng nào cần duyệt.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. INDEPENDENT EXPERT EVALUATION (E) */}
      {activeTab === "EXPERT" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 max-w-2xl">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A]">
              Chấm điểm chuyên môn độc lập (Điểm E)
            </h2>
            <p className="text-xs text-slate-500">
              Mỗi đối tượng cần tối thiểu 2 người chấm chuyên môn độc lập (không phải tác giả hoặc cộng sự) chấm 3 tiêu chí thang 1–5 trọng số bằng nhau.
            </p>
          </div>

          <form onSubmit={handleSubmitExpertEvaluation} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại đối tượng</label>
                <select
                  value={expertTargetType}
                  onChange={(e) => {
                    setExpertTargetType(e.target.value as any);
                    setExpertTargetId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="PRODUCT">Sản phẩm AI</option>
                  <option value="IDEA">Ý tưởng dạy học</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn đối tượng chấm *</label>
                <select
                  required
                  value={expertTargetId}
                  onChange={(e) => setExpertTargetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="">-- Chọn ý tưởng / sản phẩm --</option>
                  {(expertTargetType === "PRODUCT" ? products : ideas).map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.title} ({item.authorName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu chí 1: Giá trị sư phạm (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={c1}
                  onChange={(e) => setC1(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu chí 2: Tính khả thi & an toàn (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={c2}
                  onChange={(e) => setC2(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu chí 3: Khả năng nhân rộng (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={c3}
                  onChange={(e) => setC3(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nhận xét chuyên môn</label>
              <textarea
                rows={3}
                value={expertComment}
                onChange={(e) => setExpertComment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#003B3A] text-white font-bold cursor-pointer"
            >
              Gửi phiếu chấm chuyên môn (E = {(((c1 + c2 + c3) / 3) * 20).toFixed(1)}/100)
            </button>
          </form>
        </div>
      )}

      {/* 4. AWARD PERIODS & SNAPSHOT FINALIZATION */}
      {activeTab === "AWARDS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#003B3A]">
              Mở kỳ xét giải Bảng vàng mới (Asia/Ho_Chi_Minh UTC+7)
            </h2>
            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại kỳ xét giải</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="MONTHLY">Kỳ Tháng</option>
                  <option value="YEARLY">Kỳ Năm học</option>
                </select>
              </div>
              {periodType === "MONTHLY" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tháng (1–12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={monthNumber}
                    onChange={(e) => setMonthNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums"
                  />
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Năm dương lịch</label>
                <input
                  type="number"
                  value={yearNumber}
                  onChange={(e) => setYearNumber(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Niên khóa</label>
                <input
                  type="text"
                  value={academicYearName}
                  onChange={(e) => setAcademicYearName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] text-white font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Khởi tạo kỳ Bảng vàng</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-[#003B3A]">
              Danh sách các kỳ Bảng vàng & Chốt kết quả bất biến (Snapshot)
            </h2>
            {awardPeriods.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-[#003B3A]">{p.name}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    Mã: {p.code} • Trạng thái: <strong>{p.status}</strong> • Hạn rà soát 3 ngày làm việc:{" "}
                    {new Date(p.reviewDeadlineUtc).toLocaleDateString("vi-VN")}
                  </div>
                </div>
                <div>
                  {p.status !== "FINALIZED" ? (
                    <button
                      type="button"
                      onClick={() => handleFinalizePeriod(p.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#123E4A] text-white font-bold cursor-pointer"
                    >
                      Chốt Bảng vàng chính thức
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Đã chốt ({p.snapshots?.length || 0} snapshots)</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODERATION & APPEALS */}
      {activeTab === "MODERATION" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-[#003B3A]">
            Báo cáo nội dung & Giải quyết đề nghị xem lại (Phúc khảo)
          </h2>
          {reports.map((rep: any) => (
            <div
              key={rep.id}
              className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#003B3A]">
                  Đối tượng: {rep.targetType} ({rep.targetId}) • Lý do: {rep.reasonCategory}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                  {rep.status}
                </span>
              </div>
              <p className="text-slate-700">Nội dung báo cáo: {rep.description}</p>
              {rep.appealText && (
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900">
                  <strong>Nội dung phúc khảo của tác giả:</strong> {rep.appealText}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={modConclusionMap[rep.id] || "NO_VIOLATION"}
                  onChange={(e) =>
                    setModConclusionMap({ ...modConclusionMap, [rep.id]: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                >
                  <option value="NO_VIOLATION">Không vi phạm (Giữ hiển thị)</option>
                  <option value="NEEDS_EDIT">Yêu cầu tác giả chỉnh sửa</option>
                  <option value="HIDE_CONTENT">Ẩn nội dung vi phạm</option>
                  <option value="DISQUALIFY_PERIOD">Loại khỏi kỳ xét giải hiện tại</option>
                </select>
                <input
                  type="text"
                  value={modNoteMap[rep.id] || ""}
                  onChange={(e) => setModNoteMap({ ...modNoteMap, [rep.id]: e.target.value })}
                  placeholder="Ghi chú kết luận / lý do..."
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleModerationAction(rep.id, "TEMP_HIDE_SEVERE")}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer"
                >
                  Tạm ẩn khẩn cấp
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleModerationAction(
                      rep.id,
                      rep.status === "APPEAL_REQUESTED" ? "RESOLVE_APPEAL" : "CONCLUDE"
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] text-white font-bold cursor-pointer"
                >
                  Lưu kết luận & Thông báo
                </button>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Hiện không có báo cáo nội dung nào cần xử lý.
            </div>
          )}
        </div>
      )}

      {/* 6. SYSTEM ROLES, FEATURE FLAG & AUDIT LOGS */}
      {activeTab === "SYSTEM" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Cấu hình Feature Flag & Chế độ Thí điểm
              </h3>
              <div className="flex items-center justify-between">
                <span>Bật phân hệ Sky-Line Connect</span>
                <input
                  type="checkbox"
                  checked={Boolean(featureConfig.isEnabled)}
                  onChange={(e) =>
                    handleToggleFeatureFlag(e.target.checked, Boolean(featureConfig.pilotMode))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Chế độ thí điểm (Pilot Mode theo cơ sở/vai trò)</span>
                <input
                  type="checkbox"
                  checked={Boolean(featureConfig.pilotMode)}
                  onChange={(e) =>
                    handleToggleFeatureFlag(Boolean(featureConfig.isEnabled), e.target.checked)
                  }
                />
              </div>
            </div>

            <form
              onSubmit={handleAssignRole}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#003B3A]">
                Cấp quyền chuyên môn Sky-Line Connect
              </h3>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn giáo viên / nhân sự</label>
                <select
                  value={roleUserId}
                  onChange={(e) => setRoleUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers
                    .filter((t: any) => t.userId)
                    .map((t: any) => (
                      <option key={t.id} value={t.userId}>
                        {t.teacherName} ({t.teacherCode})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai trò chuyên môn</label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="COORDINATOR">Điều phối viên cộng đồng (COORDINATOR)</option>
                  <option value="EXPERT_REVIEWER">Người chấm chuyên môn (EXPERT_REVIEWER)</option>
                  <option value="EVIDENCE_VERIFIER">Người xác nhận minh chứng (EVIDENCE_VERIFIER)</option>
                  <option value="AWARD_FINALIZER">Người chốt giải Bảng vàng (AWARD_FINALIZER)</option>
                  <option value="COMMUNITY_ADMIN">Quản trị viên Sky-Line Connect</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-bold cursor-pointer"
              >
                Gán vai trò
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#159EAA]" />
              <span>Nhật ký kiểm toán (Audit Log — {auditLogs.length} bản ghi gần nhất)</span>
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-[#003B3A]">{log.action}</span> •{" "}
                    <span className="font-semibold text-slate-700">{log.actorName}</span>{" "}
                    <span className="text-slate-500">
                      ({log.targetType}: {log.targetId})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
