"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Plus,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Layers,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  UserCheck,
  FolderKanban,
  FileCheck2,
  Activity,
} from "lucide-react"
import { DEFAULT_WORKSPACE_CARDS } from "@/lib/qa-workspace/workflowEngine"
import type { WorkspaceCardConfig } from "@/lib/qa-workspace/types"

interface WorkspaceCardsViewProps {
  tasks: any[]
  taskGroups: any[]
  allStaffUsers: any[]
  sourceModules: any[]
  improvementActions: any[]
  canManage: boolean
  onAssignToCardGroup: (card: WorkspaceCardConfig, matchedGroupId?: string | null) => void
  onSelectGroupScope: (groupId: string) => void
  onSelectMember: (userId: string) => void
  onOpenAssistant: (initialPrompt?: string) => void
  onOpenGroupManager: () => void
  onOpenCapaModal: (actionToEdit?: any) => void
  onSyncSourceRecord: (moduleCode: string, item: any) => Promise<void>
  syncingRecordId: string | null
}

function CardIllustration({
  type,
  accentColor,
}: {
  type: WorkspaceCardConfig["illustrationType"]
  accentColor: string
}) {
  return (
    <svg
      viewBox="0 0 220 96"
      className="w-44 h-24 select-none pointer-events-none drop-shadow-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Desk surface */}
      <rect x="16" y="74" width="188" height="7" rx="3.5" fill={accentColor} fillOpacity="0.22" />
      <rect x="34" y="81" width="6" height="12" rx="2" fill={accentColor} fillOpacity="0.18" />
      <rect x="180" y="81" width="6" height="12" rx="2" fill={accentColor} fillOpacity="0.18" />

      {/* Indoor plant on left */}
      <rect x="24" y="58" width="14" height="16" rx="3" fill="#0D9488" fillOpacity="0.25" />
      <path
        d="M31 58C31 48 23 44 23 44C23 51 27 56 31 58Z"
        fill="#0D9488"
        fillOpacity="0.65"
      />
      <path
        d="M31 58C31 46 39 42 39 42C39 50 35 55 31 58Z"
        fill="#10B981"
        fillOpacity="0.75"
      />

      {/* Computer monitor on desk */}
      <rect
        x="54"
        y="26"
        width="68"
        height="40"
        rx="6"
        fill="#FFFFFF"
        stroke={accentColor}
        strokeWidth="2.2"
      />
      <rect x="60" y="32" width="36" height="5" rx="2.5" fill={accentColor} fillOpacity="0.3" />
      <rect x="60" y="41" width="52" height="4" rx="2" fill="#CBD5E1" />
      <rect x="60" y="48" width="44" height="4" rx="2" fill="#CBD5E1" />
      {type === "ANALYTICS_SCREEN" ? (
        <>
          <rect x="62" y="54" width="8" height="7" rx="1.5" fill={accentColor} fillOpacity="0.7" />
          <rect x="73" y="50" width="8" height="11" rx="1.5" fill={accentColor} />
          <rect x="84" y="46" width="8" height="15" rx="1.5" fill="#10B981" />
        </>
      ) : (
        <circle cx="108" cy="55" r="5" fill={accentColor} fillOpacity="0.8" />
      )}
      <rect x="82" y="66" width="12" height="8" fill={accentColor} fillOpacity="0.35" />
      <rect x="74" y="72" width="28" height="3" rx="1.5" fill={accentColor} fillOpacity="0.45" />

      {/* Character / Assistant avatar on right side of desk */}
      <circle
        cx="158"
        cy="34"
        r="12"
        fill="#FFFFFF"
        stroke={accentColor}
        strokeWidth="2.2"
      />
      <circle cx="154" cy="33" r="1.5" fill="#1E293B" />
      <circle cx="162" cy="33" r="1.5" fill="#1E293B" />
      <path
        d="M154 38C155.5 39.5 160.5 39.5 162 38"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Shoulders / Suit */}
      <path
        d="M138 74C138 58 146 50 158 50C170 50 178 58 178 74"
        fill={accentColor}
        fillOpacity="0.82"
      />
      {/* Badge / AI Sparkle if AI_ASSISTANT */}
      {type === "AI_ASSISTANT" && (
        <g>
          <circle cx="182" cy="22" r="9" fill="#6D28D9" />
          <path
            d="M182 16L183.6 20.4L188 22L183.6 23.6L182 28L180.4 23.6L176 22L180.4 20.4L182 16Z"
            fill="#FFFFFF"
          />
        </g>
      )}
      {type === "TEAM_HUB" && (
        <g>
          <circle
            cx="182"
            cy="38"
            r="9"
            fill="#FFFFFF"
            stroke={accentColor}
            strokeWidth="1.8"
          />
          <path
            d="M170 74C170 63 175 56 182 56C189 56 194 63 194 74"
            fill={accentColor}
            fillOpacity="0.5"
          />
        </g>
      )}
    </svg>
  )
}

export function WorkspaceCardsView({
  tasks,
  taskGroups,
  allStaffUsers,
  sourceModules,
  improvementActions,
  canManage,
  onAssignToCardGroup,
  onSelectGroupScope,
  onSelectMember,
  onOpenAssistant,
  onOpenGroupManager,
  onOpenCapaModal,
  onSyncSourceRecord,
  syncingRecordId,
}: WorkspaceCardsViewProps) {
  const [selectedSourceModule, setSelectedSourceModule] = useState<string | null>(null)

  const userMap = new Map(allStaffUsers.map(u => [u.id, u]))

  // Match functional card to organizational TaskGroups & tasks
  const getCardStats = (card: WorkspaceCardConfig) => {
    const matchedGroups = taskGroups.filter(g => {
      const nameLower = String(g.name || "").toLowerCase()
      if (card.key === "KHAO_THI") return nameLower.includes("khảo thí")
      if (card.key === "DBCL") return nameLower.includes("đbcl") || nameLower.includes("chất lượng")
      if (card.key === "LMS_KSDV") return nameLower.includes("lms") || nameLower.includes("đầu vào")
      if (card.key === "BAO_CAO_DU_LIEU") return nameLower.includes("báo cáo") || nameLower.includes("dữ liệu")
      return false
    })

    const matchedGroupIds = new Set(matchedGroups.map(g => g.id))

    const cardTasks = tasks.filter(t => {
      const metaCardKey = t.qaMeta?.workspaceCardKey
      if (metaCardKey && metaCardKey === card.key) return true
      if (t.taskGroupId && matchedGroupIds.has(t.taskGroupId)) return true
      const catLower = String(t.category || "").toLowerCase()
      const titleLower = String(t.title || "").toLowerCase()
      if (card.key === "KHAO_THI" && (catLower.includes("khảo thí") || catLower.includes("kiểm tra") || catLower.includes("kỳ thi"))) {
        return true
      }
      if (card.key === "DBCL" && (catLower.includes("đbcl") || catLower.includes("kiểm định") || catLower.includes("chất lượng"))) {
        return true
      }
      if (card.key === "LMS_KSDV" && (catLower.includes("lms") || catLower.includes("đầu vào") || titleLower.includes("lms"))) {
        return true
      }
      if (card.key === "BAO_CAO_DU_LIEU" && (catLower.includes("báo cáo") || catLower.includes("dữ liệu") || catLower.includes("thống kê"))) {
        return true
      }
      if (card.key === "CONG_VIEC_THANH_VIEN" && (catLower.includes("nhân sự") || catLower.includes("điều phối"))) {
        return true
      }
      return false
    })

    const total = cardTasks.length
    const inProgress = cardTasks.filter(
      t => (t.qaMeta?.workflowStatus || t.progress) === "IN_PROGRESS"
    ).length
    const pendingReview = cardTasks.filter(
      t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
    ).length
    const overdue = cardTasks.filter(t =>
      Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
    ).length
    const completed = cardTasks.filter(
      t => (t.qaMeta?.workflowStatus || t.progress) === "COMPLETED"
    ).length

    return {
      matchedGroups,
      primaryGroupId: matchedGroups[0]?.id || null,
      total,
      inProgress,
      pendingReview,
      overdue,
      completed,
    }
  }

  return (
    <div className="space-y-8">
      {/* PHẦN 1: LƯỚI 6 THẺ TRUY CẬP CHỨC NĂNG & ĐIỀU HÀNH (3 CỘT DESKTOP / 2 TABLET / 1 MOBILE) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-800" />
              Không gian Công việc & Phân hệ Nghiệp vụ KT&ĐBCL
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Truy cập nhanh các mảng nghiệp vụ cốt lõi, theo dõi khối lượng trực tiếp và phát hành phiếu giao việc theo nhóm chuyên môn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <Sparkles className="w-3.5 h-3.5" />6 Không gian chức năng chuẩn
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEFAULT_WORKSPACE_CARDS.map(card => {
            const stats = getCardStats(card)
            return (
              <div
                key={card.key}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Đầu mỗi thẻ: nền màu chuyển nhẹ + minh họa bàn làm việc / máy tính / nhân vật trợ lý */}
                <div
                  className="px-5 pt-4 pb-2 flex items-center justify-between relative border-b border-slate-100"
                  style={{
                    background: `linear-gradient(135deg, ${card.gradientFrom} 0%, ${card.gradientTo} 100%)`,
                  }}
                >
                  <div className="z-10 max-w-[52%]">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/85 shadow-2xs"
                      style={{ color: card.accentColor }}
                    >
                      {card.badgeText}
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {stats.total}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        nhiệm vụ
                      </span>
                    </div>
                  </div>
                  <div className="z-10 transform group-hover:scale-105 transition-transform duration-200">
                    <CardIllustration
                      type={card.illustrationType}
                      accentColor={card.accentColor}
                    />
                  </div>
                </div>

                {/* Thân thẻ: Tên nhóm, mô tả ngắn, thống kê trạng thái, lối truy cập nghiệp vụ & nút Giao việc cho nhóm */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-teal-800 transition-colors">
                        {card.title}
                      </h3>
                      {stats.overdue > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          {stats.overdue} quá hạn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                      {card.shortDescription}
                    </p>

                    {/* Mini status pills */}
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
                        <div className="text-xs font-bold text-sky-700">{stats.inProgress}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Đang làm</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
                        <div className="text-xs font-bold text-teal-800">{stats.pendingReview}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Chờ duyệt</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
                        <div className="text-xs font-bold text-emerald-700">{stats.completed}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Hoàn thành</div>
                      </div>
                    </div>

                    {/* Các lối truy cập nghiệp vụ */}
                    <div className="mt-3.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Lối truy cập nghiệp vụ
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {card.quickLinks.map((ql, idx) =>
                          ql.href.startsWith("?") ? (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (ql.href.includes("assistant=open")) {
                                  onOpenAssistant()
                                } else if (stats.primaryGroupId) {
                                  onSelectGroupScope(stats.primaryGroupId)
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 transition-colors"
                            >
                              <span>{ql.label}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-70" />
                            </button>
                          ) : (
                            <Link
                              key={idx}
                              href={ql.href}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 transition-colors"
                            >
                              <span>{ql.label}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động chính màu tím thương hiệu SSM */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {card.key === "TRO_LY_DIEU_HANH" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAssistant(
                            "Giao nhóm Khảo thí rà soát ma trận khối 6 trước 16:00 thứ Sáu; phân công theo môn và nộp bảng tổng hợp điều chỉnh."
                          )
                        }
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-500 text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Mở QA Assistant & Giao việc AI
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onAssignToCardGroup(card, stats.primaryGroupId)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-500 text-white shadow-xs transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Giao việc cho nhóm
                        </button>
                        {stats.primaryGroupId && (
                          <button
                            type="button"
                            onClick={() => onSelectGroupScope(stats.primaryGroupId!)}
                            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Lọc danh sách việc của nhóm này"
                          >
                            Xem việc
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PHẦN 2: PHÂN BIỆT NHÓM NHÂN SỰ TỔ CHỨC (TASK GROUPS) & THÀNH VIÊN THỰC TẾ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Nhóm Nhân sự Chuyên môn & Điều phối viên ({taskGroups.length} nhóm cấu hình thực tế)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân biệt rõ với 6 thẻ chức năng phía trên: đây là các nhóm nhân sự thực tế trong Ban KT&ĐBCL. Chọn thành viên để xem hồ sơ công việc hoặc giao việc trực tiếp.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onOpenGroupManager}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shrink-0"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              Quản lý Nhóm & Điều phối viên
            </button>
          )}
        </div>

        {taskGroups.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Chưa có nhóm nhân sự nào được cấu hình. Nhấn &ldquo;Quản lý Nhóm & Điều phối viên&rdquo; để khởi tạo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taskGroups.map(group => {
              let memberIds: string[] = []
              try {
                memberIds = group.memberUserIds ? JSON.parse(group.memberUserIds) : []
              } catch {
                memberIds = []
              }
              const leader = group.leaderUserId ? userMap.get(group.leaderUserId) : null
              const groupTasks = tasks.filter(t => t.taskGroupId === group.id)
              const overdueCount = groupTasks.filter(t => t.deadlineInfo?.isOverdue).length

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-200 p-4 hover:border-teal-400 transition-colors bg-slate-50/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{group.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {group.description || `Bộ phận: ${group.department || "KT&ĐBCL"}`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {groupTasks.length} việc
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <UserCheck className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                      <span className="text-slate-500">Điều phối:</span>
                      {leader ? (
                        <button
                          type="button"
                          onClick={() => onSelectMember(leader.id)}
                          className="font-bold text-teal-800 hover:underline cursor-pointer"
                        >
                          {leader.fullName}
                        </button>
                      ) : (
                        <span className="text-amber-600 font-medium">Chưa chỉ định</span>
                      )}
                    </div>

                    {/* Danh sách thành viên */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {memberIds.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Chưa gán thành viên
                        </span>
                      ) : (
                        memberIds.slice(0, 6).map(uid => {
                          const u = userMap.get(uid)
                          if (!u) return null
                          return (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => onSelectMember(uid)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:border-teal-200 hover:text-teal-800 transition-colors cursor-pointer"
                            >
                              <span className="w-4 h-4 rounded-full bg-teal-50 text-teal-800 text-[9px] font-bold flex items-center justify-center">
                                {String(u.fullName || "U")
                                  .trim()
                                  .split(" ")
                                  .pop()
                                  ?.slice(0, 1)}
                              </span>
                              {u.fullName}
                            </button>
                          )
                        })
                      )}
                      {memberIds.length > 6 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-600">
                          +{memberIds.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">
                      {overdueCount > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {overdueCount} việc quá hạn
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          Đúng tiến độ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectGroupScope(group.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Lọc việc
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAssignToCardGroup(DEFAULT_WORKSPACE_CARDS[0], group.id)
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-500 text-white cursor-pointer"
                      >
                        + Giao việc
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PHẦN 3: LIÊN THÔNG 6 PHÂN HỆ NGHIỆP VỤ NGUỒN & HÀNH ĐỘNG CẢI TIẾN CHẤT LƯỢNG (CAPA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột trái (7 cols): Liên thông 6 phân hệ nguồn */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-800" />
                Liên thông Dữ liệu Nghiệp vụ Nguồn (6 Phân hệ SSM)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi nhiệm vụ liên thông có định danh <code className="text-[11px] bg-slate-100 px-1 rounded">externalSyncKey</code> chống tạo việc trùng lặp khi đồng bộ lại.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sourceModules.map((mod: any) => {
              const isSelected = selectedSourceModule === mod.moduleCode
              return (
                <div
                  key={mod.moduleCode}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-teal-200 bg-teal-50/30"
                      : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          {mod.moduleName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            mod.status === "CONNECTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {mod.status === "CONNECTED" ? "Đã kết nối CSDL" : "Giới hạn API"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {mod.limitationNote}
                      </p>
                    </div>
                    <span className="text-sm font-black text-teal-800 shrink-0">
                      {mod.totalRecords}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <Link
                      href={mod.routeUrl}
                      className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      Mở phân hệ nguồn <ExternalLink className="w-3 h-3" />
                    </Link>
                    {mod.recentItems?.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSourceModule(
                            isSelected ? null : mod.moduleCode
                          )
                        }
                        className="text-teal-800 font-bold hover:underline cursor-pointer"
                      >
                        {isSelected ? "Thu gọn" : `Xem ${mod.recentItems.length} hồ sơ`}
                      </button>
                    )}
                  </div>

                  {isSelected && mod.recentItems?.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-teal-200/60">
                      {mod.recentItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.subtitle}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={syncingRecordId === item.id}
                            onClick={() => onSyncSourceRecord(mod.moduleCode, item)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-500 hover:bg-teal-500 disabled:opacity-50 text-white shrink-0 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${
                                syncingRecordId === item.id ? "animate-spin" : ""
                              }`}
                            />
                            Tạo/Đồng bộ việc
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cột phải (5 cols): Quản lý Hành động Cải tiến Chất lượng (CAPA 5 bước) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Hành động Cải tiến Chất lượng (CAPA)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tách biệt rõ <strong>Hoàn thành hành động</strong> và <strong>Xác nhận hiệu quả sau cải tiến</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenCapaModal()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-500 text-white shrink-0 cursor-pointer"
              >
                + Ghi nhận CAPA
              </button>
            </div>

            {/* 5-step pipeline indicator */}
            <div className="grid grid-cols-5 gap-1 mb-3 text-[10px] font-bold text-center">
              <div className="bg-slate-100 text-slate-700 py-1 px-1 rounded">
                1. Vấn đề
              </div>
              <div className="bg-amber-50 text-amber-800 py-1 px-1 rounded">
                2. Nguyên nhân
              </div>
              <div className="bg-sky-50 text-sky-800 py-1 px-1 rounded">
                3. Giao HĐ
              </div>
              <div className="bg-teal-50 text-teal-800 py-1 px-1 rounded">
                4. KT Kết quả
              </div>
              <div className="bg-emerald-50 text-emerald-800 py-1 px-1 rounded">
                5. XN Hiệu quả
              </div>
            </div>

            {improvementActions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có hồ sơ Hành động cải tiến chất lượng (CAPA) nào.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {improvementActions.slice(0, 6).map((act: any) => {
                  const isEffective =
                    act.status === "VERIFIED_EFFECTIVE" ||
                    act.status === "CLOSED" ||
                    Boolean(act.verifiedAt && act.postImprovementEffectiveness)
                  const isActionDone =
                    act.status === "COMPLETED" ||
                    act.status === "PENDING_VERIFICATION" ||
                    isEffective

                  return (
                    <div
                      key={act.id}
                      onClick={() => onOpenCapaModal(act)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-teal-200 bg-slate-50/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          [{act.issueCode}] {act.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isEffective
                              ? "bg-emerald-100 text-emerald-800"
                              : isActionDone
                              ? "bg-teal-50 text-teal-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isEffective
                            ? "Đã XN Hiệu quả"
                            : isActionDone
                            ? "Hoàn thành HĐ (Chờ XN hiệu quả)"
                            : act.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                        Nguyên nhân: {act.verifiedRootCause}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Phụ trách: {act.assigneeName || "Đã chỉ định"}</span>
                        <span>
                          Hạn: {new Date(act.dueDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
