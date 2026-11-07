"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Users, Star, ArrowUpRight, Plus, ExternalLink } from "lucide-react";

interface OverviewWidgetData {
  enabled: boolean;
  recommendedProducts: Array<{
    id: string;
    title: string;
    postType: string;
    authorName: string;
    campusName: string | null;
    subjectName: string | null;
    gradeBand: string | null;
    avgRating: number;
    ratingCount: number;
    product: {
      id: string;
      trialUrl: string | null;
    } | null;
  }>;
  openProjects: Array<{
    id: string;
    postId: string | null;
    title: string;
    summary: string;
    neededRoles: string[];
    neededHeadcount: number;
    currentMemberCount: number;
    leaderName: string;
    campusName: string | null;
    subjectName: string | null;
    gradeBand: string | null;
  }>;
}

export function SkylineConnectOverviewWidget({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<OverviewWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    fetch("/api/skyline-connect?action=overviewWidget", {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.enabled !== false) {
          setData(json);
        } else {
          setData({ enabled: true, recommendedProducts: [], openProjects: [] });
        }
      })
      .catch(() => {
        // Fail-safe: never break or block the teacher overview page if community API fails
        setData({ enabled: true, recommendedProducts: [], openProjects: [] });
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (data && data.enabled === false) {
    return null;
  }

  return (
    <section
      aria-label="Có gì mới trên Sky-Line Connect?"
      className={`bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-2xs overflow-hidden ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#123E4A] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#5EEAD4]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Có gì mới trên Sky-Line Connect?
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                Bức tường ý tưởng AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khám phá sản phẩm AI dạy học, học liệu mới và dự án đang tìm cộng sự trong toàn hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href="/teacher/skyline-connect?compose=IDEA"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#159EAA] hover:bg-[#11828C] text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Chia sẻ ý tưởng</span>
          </Link>
          <Link
            href="/teacher/skyline-connect"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-[#003B3A] border border-slate-200 transition-colors"
          >
            <span>Xem cộng đồng</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3.5">
          <div className="h-24 rounded-xl bg-slate-50 animate-pulse border border-slate-100" />
          <div className="h-24 rounded-xl bg-slate-50 animate-pulse border border-slate-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3.5">
          {/* Left: Recommended Products & Ideas */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Sản phẩm AI & ý tưởng phù hợp
              </span>
              <Link
                href="/teacher/skyline-connect/explore"
                className="text-[#159EAA] hover:underline font-medium"
              >
                Khám phá thêm →
              </Link>
            </div>

            {data?.recommendedProducts && data.recommendedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.recommendedProducts.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-[#F8FAFC] hover:border-[#159EAA]/50 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-[#123E4A] border border-teal-200/60">
                          {item.postType === "AI_PRODUCT" ? "Sản phẩm AI" : "Ý tưởng"}
                        </span>
                        {item.ratingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 tabular-nums">
                            <Star className="w-3 h-3 fill-[#D6A74A] text-[#D6A74A]" />
                            {item.avgRating.toFixed(1)} ({item.ratingCount})
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/teacher/skyline-connect/posts/${item.id}`}
                        className="text-xs font-bold text-slate-800 hover:text-[#159EAA] line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.authorName}
                        {item.subjectName ? ` • ${item.subjectName}` : ""}
                        {item.gradeBand ? ` • ${item.gradeBand}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <Link
                        href={`/teacher/skyline-connect/posts/${item.id}`}
                        className="text-[11px] font-semibold text-[#123E4A] hover:text-[#159EAA]"
                      >
                        Xem chi tiết
                      </Link>
                      {item.product?.trialUrl && (
                        <a
                          href={item.product.trialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#159EAA] hover:underline"
                        >
                          <span>Dùng thử</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Bức tường ý tưởng AI đang sẵn sàng đón bài chia sẻ đầu tiên
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Chia sẻ công cụ AI, prompt, học liệu hoặc sáng kiến giảng dạy cùng đồng nghiệp Sky-Line.
                  </p>
                </div>
                <Link
                  href="/teacher/skyline-connect?compose=IDEA"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-[#123E4A] hover:border-[#159EAA] shrink-0"
                >
                  + Đăng ngay
                </Link>
              </div>
            )}
          </div>

          {/* Right: Projects Seeking Collaborators */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#159EAA]" />
                <span>Dự án tìm cộng sự</span>
              </span>
              <Link
                href="/teacher/skyline-connect/groups-projects"
                className="text-[#159EAA] hover:underline font-medium"
              >
                Nhóm & Dự án →
              </Link>
            </div>

            {data?.openProjects && data.openProjects.length > 0 ? (
              <div className="space-y-2">
                {data.openProjects.slice(0, 2).map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-[#F8FAFC] hover:border-[#159EAA]/50 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={
                          proj.postId
                            ? `/teacher/skyline-connect/posts/${proj.postId}`
                            : `/teacher/skyline-connect/projects/${proj.id}`
                        }
                        className="text-xs font-bold text-slate-800 hover:text-[#159EAA] truncate block"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 tabular-nums">
                        Chủ trì: {proj.leaderName} • Cần thêm {Math.max(1, proj.neededHeadcount)} cộng sự
                      </p>
                    </div>
                    <Link
                      href={
                        proj.postId
                          ? `/teacher/skyline-connect/posts/${proj.postId}`
                          : `/teacher/skyline-connect/projects/${proj.id}`
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#159EAA]/10 text-[#123E4A] hover:bg-[#159EAA] hover:text-white transition-colors shrink-0"
                    >
                      Tham gia
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Chưa có dự án đang mở tuyển cộng sự
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Khởi tạo dự án liên môn hoặc mời đồng nghiệp cùng phát triển sản phẩm AI.
                  </p>
                </div>
                <Link
                  href="/teacher/skyline-connect?compose=PROJECT"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-[#123E4A] hover:border-[#159EAA] shrink-0"
                >
                  Mở dự án
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
