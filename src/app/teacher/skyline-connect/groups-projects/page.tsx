"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Lock,
  Globe,
  CheckCircle2,
  UserPlus,
  Layers,
  Milestone,
  ArrowUpRight,
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import { PostComposerModal } from "@/components/skyline-connect/PostComposerModal";

function GroupsAndProjectsContent() {
  const [activeTab, setActiveTab] = useState<"PROJECTS" | "GROUPS">("PROJECTS");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  // Create Group modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupVisibility, setGroupVisibility] = useState<"PUBLIC_INTERNAL" | "PRIVATE">(
    "PUBLIC_INTERNAL"
  );

  // Add Progress modal
  const [progressProjectId, setProgressProjectId] = useState<string | null>(null);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressContent, setProgressContent] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/skyline-connect?action=groupsAndProjects");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "groupAction",
          subAction: "CREATE_GROUP",
          name: groupName.trim(),
          description: groupDesc.trim(),
          visibility: groupVisibility,
        }),
      });
      // Note: service expects body.action="groupAction" and input.action="CREATE_GROUP"
      if (res.ok) {
        setGroupModalOpen(false);
        setGroupName("");
        setGroupDesc("");
        notify("Đã tạo nhóm chuyên môn thành công!");
        loadData();
      }
    } catch {
      // ignore
    }
  };

  const handleGroupMembership = async (
    groupId: string,
    groupSubAction: "JOIN_GROUP" | "APPROVE_MEMBER" | "LEAVE_GROUP",
    targetUserId?: string
  ) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "groupAction",
        groupId,
        targetUserId,
        // pass both for compatibility
        groupActionType: groupSubAction,
      }),
    });
    if (res.ok) {
      loadData();
    }
  };

  const handleProjectCollaboration = async (
    projectId: string,
    collabAction:
      | "REQUEST_JOIN"
      | "APPROVE_REQUEST"
      | "REJECT_REQUEST"
      | "ACCEPT_INVITE",
    targetUserId?: string
  ) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "projectAction",
        projectId,
        collabAction,
        targetUserId,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      notify("Đã cập nhật trạng thái thành viên dự án!");
      loadData();
    } else {
      notify(json.message || "Không thể thực hiện thao tác.");
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressProjectId) return;
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addProjectProgress",
        projectId: progressProjectId,
        title: progressTitle.trim(),
        content: progressContent.trim(),
      }),
    });
    if (res.ok) {
      setProgressProjectId(null);
      setProgressTitle("");
      setProgressContent("");
      notify("Đã ghi nhận tiến độ dự án!");
      loadData();
    }
  };

  const currentUserId = data?.currentUser?.userId || "";
  const projects = data?.projects || [];
  const groups = data?.groups || [];

  return (
    <div className="min-h-screen bg-[#F5F8FA] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#123E4A] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg">
          {toastMsg}
        </div>
      )}

      <SkylineConnectSubNav
        showAdminLink={Boolean(data?.currentUser?.permissions?.isAdmin)}
        onOpenComposer={() => setComposerOpen(true)}
      />

      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#123E4A] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#123E4A] text-white flex items-center justify-center">
            <Users className="w-5 h-5 text-[#5EEAD4]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#123E4A]">Nhóm chuyên môn & Dự án</h1>
            <p className="text-xs text-slate-500">
              Không gian hợp tác phát triển sản phẩm AI, học liệu liên môn và sinh hoạt cộng đồng chuyên môn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mở dự án mới</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#123E4A] text-xs font-bold cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#159EAA]" />
            <span>Tạo nhóm chuyên môn</span>
          </button>
        </div>
      </header>

      {/* Switch Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("PROJECTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "PROJECTS"
              ? "bg-[#123E4A] text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Dự án hợp tác ({projects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("GROUPS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "GROUPS"
              ? "bg-[#123E4A] text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Nhóm chuyên môn ({groups.length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </div>
      ) : activeTab === "PROJECTS" ? (
        projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: any) => {
              const isOwner = proj.ownerId === currentUserId;
              const myMembership = (proj.members || []).find(
                (m: any) => m.userId === currentUserId
              );
              const pendingRequests = (proj.members || []).filter(
                (m: any) => m.status === "PENDING_REQUEST"
              );
              const approvedMembers = (proj.members || []).filter(
                (m: any) => m.status === "APPROVED"
              );

              return (
                <div
                  key={proj.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          proj.status === "SEEKING_COLLABORATORS"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : proj.status === "HAS_PRODUCT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-teal-50 text-[#00736E] border-teal-200"
                        }`}
                      >
                        {proj.status === "SEEKING_COLLABORATORS"
                          ? "Đang tìm cộng sự"
                          : proj.status === "HAS_PRODUCT"
                          ? "Đã có sản phẩm"
                          : "Đang triển khai"}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {approvedMembers.length} thành viên chính thức
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#123E4A]">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{proj.goal}</p>

                    <div className="text-xs text-slate-500">
                      Chủ nhiệm: <strong className="text-slate-700">{proj.ownerName}</strong> •{" "}
                      {proj.campusName || "Hệ thống Sky-Line"}
                    </div>

                    {proj.neededRoles && proj.neededRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.neededRoles.map((r: string, i: number) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                          >
                            Cần: {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress Updates */}
                    {proj.progressUpdates && proj.progressUpdates.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-1">
                        <div className="text-[11px] font-bold text-[#123E4A] flex items-center gap-1">
                          <Milestone className="w-3.5 h-3.5 text-[#159EAA]" />
                          <span>Tiến độ mới nhất: {proj.progressUpdates[0].title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {proj.progressUpdates[0].content}
                        </p>
                      </div>
                    )}

                    {/* Pending Join Requests for Project Owner */}
                    {isOwner && pendingRequests.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                        <div className="text-xs font-bold text-amber-900">
                          Yêu cầu tham gia chờ duyệt ({pendingRequests.length})
                        </div>
                        {pendingRequests.map((req: any) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-amber-200"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{req.userName}</span>{" "}
                              <span className="text-slate-500">({req.roleName})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleProjectCollaboration(
                                    proj.id,
                                    "APPROVE_REQUEST",
                                    req.userId
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleProjectCollaboration(
                                    proj.id,
                                    "REJECT_REQUEST",
                                    req.userId
                                  )
                                }
                                className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                    {proj.postId ? (
                      <Link
                        href={`/teacher/skyline-connect/posts/${proj.postId}`}
                        className="text-xs font-bold text-[#159EAA] hover:underline flex items-center gap-1"
                      >
                        <span>Xem bài giới thiệu & thảo luận</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2">
                      {(isOwner || myMembership?.status === "APPROVED") && (
                        <button
                          type="button"
                          onClick={() => setProgressProjectId(proj.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          + Cập nhật tiến độ
                        </button>
                      )}

                      {myMembership?.status === "INVITED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleProjectCollaboration(proj.id, "ACCEPT_INVITE")
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Chấp nhận lời mời
                        </button>
                      ) : myMembership?.status === "PENDING_REQUEST" ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          Đang chờ chủ dự án duyệt
                        </span>
                      ) : !isOwner && myMembership?.status !== "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleProjectCollaboration(proj.id, "REQUEST_JOIN")
                          }
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Đăng ký cộng sự</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Thành viên dự án</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
            <p className="text-sm font-bold text-[#123E4A]">
              Chưa có dự án hợp tác nào được khởi tạo
            </p>
            <p className="text-xs text-slate-500">
              Khởi tạo dự án từ ý tưởng dạy học để mời đồng nghiệp cùng xây dựng sản phẩm AI hoặc bộ học liệu.
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
            >
              + Mở dự án đầu tiên
            </button>
          </div>
        )
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((grp: any) => (
            <div
              key={grp.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {grp.visibility === "PRIVATE" ? (
                      <>
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Nhóm riêng tư</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-[#159EAA]" />
                        <span>Nhóm công khai nội bộ</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {grp.memberCount || 1} thành viên
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#123E4A]">{grp.name}</h3>
                <p className="text-xs text-slate-600">
                  {grp.description || "Không gian trao đổi học thuật và chia sẻ sản phẩm AI."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Quản trị: {grp.ownerName || "Sky-Line"}
                </span>
                {grp.myStatus === "APPROVED" ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã tham gia</span>
                  </span>
                ) : grp.myStatus === "PENDING" ? (
                  <span className="text-xs font-semibold text-amber-700">Chờ duyệt</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGroupMembership(grp.id, "JOIN_GROUP")}
                    className="px-3 py-1.5 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
                  >
                    Tham gia nhóm
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
          <p className="text-sm font-bold text-[#123E4A]">Chưa có nhóm chuyên môn</p>
          <button
            type="button"
            onClick={() => setGroupModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
          >
            + Tạo nhóm chuyên môn
          </button>
        </div>
      )}

      {/* Modal: Create Group */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3.5 text-xs shadow-xl"
          >
            <h3 className="text-sm font-bold text-[#123E4A]">Tạo nhóm chuyên môn mới</h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên nhóm *</label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: CLB Giáo viên Ứng dụng AI Tiểu học"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mô tả mục tiêu nhóm</label>
              <textarea
                rows={3}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quyền riêng tư</label>
              <select
                value={groupVisibility}
                onChange={(e) => setGroupVisibility(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                <option value="PUBLIC_INTERNAL">
                  Công khai nội bộ (mọi GV Sky-Line có thể xem và tham gia)
                </option>
                <option value="PRIVATE">
                  Nhóm riêng tư (chỉ thành viên được duyệt mới xem bài và tệp)
                </option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#159EAA] text-white font-bold cursor-pointer"
              >
                Tạo nhóm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Project Progress */}
      {progressProjectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddProgress}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3.5 text-xs shadow-xl"
          >
            <h3 className="text-sm font-bold text-[#123E4A]">Cập nhật tiến độ dự án</h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mốc tiến độ *</label>
              <input
                type="text"
                required
                value={progressTitle}
                onChange={(e) => setProgressTitle(e.target.value)}
                placeholder="Ví dụ: Hoàn thành bản thử nghiệm v1.0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chi tiết kết quả *</label>
              <textarea
                rows={3}
                required
                value={progressContent}
                onChange={(e) => setProgressContent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProgressProjectId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#159EAA] text-white font-bold cursor-pointer"
              >
                Lưu tiến độ
              </button>
            </div>
          </form>
        </div>
      )}

      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={loadData}
        initialData={{ postType: "PROJECT" }}
        catalogs={data?.catalogs}
      />
    </div>
  );
}

export default function GroupsAndProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải Nhóm & Dự án...</div>}>
      <GroupsAndProjectsContent />
    </Suspense>
  );
}
