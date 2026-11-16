"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Users,
  Star,
  ArrowUpRight,
  Plus,
  ExternalLink,
  Lightbulb,
  Bot,
  Share2,
  Puzzle,
  Compass,
  Wand2,
  Rocket,
} from "lucide-react";

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

/**
 * Hình nền Không gian sáng tạo AI (Creative Studio Backdrop):
 * Kết hợp lưới chòm sao tri thức (SVG constellation) và các icon đặc trưng:
 * Ý tưởng (Lightbulb), AI sáng tạo (Bot, Wand2, Sparkles), Chia sẻ (Share2, Users), Không gian sáng tạo (Puzzle, Rocket, Compass).
 */
export function CreativeWallBackdrop({ variant = "widget" }: { variant?: "widget" | "banner" }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* Dải hào quang màu sắc thương hiệu Sky-Line kết hợp sắc vàng Ý tưởng & xanh AI */}
      <div
        className="absolute -top-20 -right-16 w-80 h-80 rounded-full opacity-55 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,161,154,0.22) 0%, rgba(94,234,212,0.12) 45%, transparent 72%)",
        }}
      />
      <div
        className="absolute -bottom-24 right-1/4 w-72 h-72 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,6,0.15) 0%, rgba(251,191,36,0.08) 48%, transparent 72%)",
        }}
      />
      <div
        className="absolute -top-16 left-1/3 w-64 h-64 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(2,132,199,0.12) 0%, rgba(0,59,58,0.05) 55%, transparent 75%)",
        }}
      />

      {/* Lưới chấm & đường nối mạng lưới chia sẻ ý tưởng AI (SVG Constellation) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`slc-creative-grid-${variant}`}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.1" fill="#00736E" fillOpacity="0.35" />
          </pattern>
          <linearGradient id={`slc-line-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A19A" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#D97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#003B3A" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#slc-creative-grid-${variant})`} />
        <path
          d="M 620 22 Q 710 68 810 34 T 990 78"
          fill="none"
          stroke={`url(#slc-line-grad-${variant})`}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 680 120 Q 790 85 910 135 T 1120 95"
          fill="none"
          stroke={`url(#slc-line-grad-${variant})`}
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
      </svg>

      {/* Cụm Icon nền nghệ thuật: Ý tưởng • AI sáng tạo • Chia sẻ • Không gian sáng tạo */}
      <div className="hidden sm:block absolute top-3 right-52 text-amber-500/15 -rotate-12">
        <Lightbulb className="w-14 h-14 stroke-[1.5]" />
      </div>
      <div className="hidden md:block absolute top-2 right-12 text-[#00A19A]/15 rotate-12">
        <Bot className="w-16 h-16 stroke-[1.4]" />
      </div>
      <div className="hidden lg:block absolute bottom-3 right-6 text-[#003B3A]/10 -rotate-6">
        <Puzzle className="w-20 h-20 stroke-[1.3]" />
      </div>
      <div className="hidden md:block absolute bottom-2 right-72 text-sky-600/12 rotate-6">
        <Share2 className="w-12 h-12 stroke-[1.5]" />
      </div>
      <div className="hidden lg:block absolute top-1/2 left-[46%] -translate-y-1/2 text-[#00A19A]/10 rotate-12">
        <Wand2 className="w-14 h-14 stroke-[1.3]" />
      </div>
      <div className="hidden sm:block absolute bottom-4 left-8 text-amber-600/10 -rotate-12">
        <Rocket className="w-11 h-11 stroke-[1.4]" />
      </div>
      <div className="hidden xl:block absolute top-4 left-[36%] text-[#00736E]/12">
        <Compass className="w-10 h-10 stroke-[1.4]" />
      </div>
    </div>
  );
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
      className={`relative rounded-2xl border border-[#CCFBF1] border-l-4 border-l-[#003B3A] shadow-xs overflow-hidden transition-all ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      }`}
      style={{
        background:
          "linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 45%, #F8FAFC 75%, #FFFBEB 100%)",
      }}
    >
      {/* Dải sắc màu nhận diện Không gian sáng tạo ở đỉnh thẻ */}
      <div
        className="absolute top-0 left-0 right-0 h-1 z-20"
        style={{
          background:
            "linear-gradient(90deg, #003B3A 0%, #00A19A 45%, #D97706 80%, #0284C7 100%)",
        }}
      />

      {/* Hình nền các icon Ý tưởng, AI sáng tạo, Chia sẻ, Không gian sáng tạo */}
      <CreativeWallBackdrop variant="widget" />

      {/* Header Strip */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-[#00A19A]/15">
        <div className="flex items-start sm:items-center gap-3">
          {/* Cụm biểu tượng kép: Không gian AI & Ý tưởng */}
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-sm border border-white/80"
              style={{
                background: "linear-gradient(135deg, #003B3A 0%, #00A19A 100%)",
              }}
            >
              <Lightbulb className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs border border-white">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-[#003B3A] tracking-tight">
                Có gì mới trên Sky-Line Connect?
              </h2>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                style={{
                  background: "linear-gradient(135deg, #00736E 0%, #00A19A 100%)",
                }}
              >
                <Bot className="w-3 h-3 text-[#99F6E4]" />
                <span>Bức tường ý tưởng AI</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Khám phá sản phẩm AI dạy học, học liệu mới và dự án đang tìm cộng sự trong toàn hệ thống
            </p>

            {/* Dải chip biểu tượng 4 trụ cột: Ý tưởng • AI sáng tạo • Chia sẻ • Không gian sáng tạo */}
            {!compact && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50/90 text-amber-800 border border-amber-200/80">
                  <Lightbulb className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Ý tưởng sáng tạo</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50/90 text-[#00736E] border border-teal-200/80">
                  <Wand2 className="w-3 h-3 text-[#00A19A] shrink-0" />
                  <span>AI dạy học</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50/90 text-sky-800 border border-sky-200/80">
                  <Share2 className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>Chia sẻ học liệu</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200/80">
                  <Puzzle className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Không gian đồng sáng tạo</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href="/teacher/skyline-connect?compose=IDEA"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs hover:shadow-md hover:opacity-95"
            style={{
              background: "linear-gradient(135deg, #003B3A 0%, #00A19A 100%)",
            }}
          >
            <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Chia sẻ ý tưởng</span>
          </Link>
          <Link
            href="/teacher/skyline-connect"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-[#003B3A] border border-[#99F6E4] shadow-2xs transition-all"
          >
            <span>Xem cộng đồng</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#00A19A]" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
          <div className="h-28 rounded-xl bg-white/80 animate-pulse border border-teal-100" />
          <div className="h-28 rounded-xl bg-white/80 animate-pulse border border-amber-100" />
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
          {/* Left: Recommended Products & Ideas */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-200/80 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                </span>
                <span>Sản phẩm AI & ý tưởng phù hợp</span>
              </span>
              <Link
                href="/teacher/skyline-connect/explore"
                className="text-[#00736E] hover:text-[#003B3A] hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Khám phá thêm</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recommendedProducts && data.recommendedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.recommendedProducts.slice(0, 2).map((item) => {
                  const isProduct = item.postType === "AI_PRODUCT";
                  return (
                    <div
                      key={item.id}
                      className="group relative p-3.5 rounded-xl border border-teal-200/80 bg-white/90 backdrop-blur-xs hover:bg-white hover:border-[#00A19A] hover:shadow-sm transition-all flex flex-col justify-between gap-2.5 overflow-hidden"
                    >
                      {/* Icon chìm trang trí góc phải thẻ */}
                      <div className="absolute -bottom-2 -right-2 pointer-events-none opacity-[0.08] group-hover:opacity-[0.14] transition-opacity">
                        {isProduct ? (
                          <Bot className="w-16 h-16 text-[#00A19A]" />
                        ) : (
                          <Lightbulb className="w-16 h-16 text-amber-500" />
                        )}
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              isProduct
                                ? "bg-teal-50 text-[#00736E] border-teal-200/80"
                                : "bg-amber-50 text-amber-800 border-amber-200/80"
                            }`}
                          >
                            {isProduct ? (
                              <Bot className="w-3 h-3 text-[#00A19A]" />
                            ) : (
                              <Lightbulb className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{isProduct ? "Sản phẩm AI" : "Ý tưởng"}</span>
                          </span>
                          {item.ratingCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2 py-0.5 rounded-full tabular-nums">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {item.avgRating.toFixed(1)} ({item.ratingCount})
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/teacher/skyline-connect/posts/${item.id}`}
                          className="text-xs sm:text-[13px] font-bold text-[#0F172A] group-hover:text-[#00736E] line-clamp-1 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate font-medium">
                          {item.authorName}
                          {item.subjectName ? ` • ${item.subjectName}` : ""}
                          {item.gradeBand ? ` • ${item.gradeBand}` : ""}
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-slate-100">
                        <Link
                          href={`/teacher/skyline-connect/posts/${item.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003B3A] hover:text-[#00A19A]"
                        >
                          <span>Xem chi tiết</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        {item.product?.trialUrl && (
                          <a
                            href={item.product.trialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00736E] hover:underline"
                          >
                            <span>Dùng thử</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative p-4 rounded-xl border border-dashed border-[#00A19A]/40 bg-white/85 backdrop-blur-xs flex items-center justify-between gap-3 overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#003B3A]">
                      Bức tường ý tưởng AI đang sẵn sàng đón bài chia sẻ đầu tiên
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Chia sẻ công cụ AI, prompt, học liệu hoặc sáng kiến giảng dạy cùng đồng nghiệp Sky-Line.
                    </p>
                  </div>
                </div>
                <Link
                  href="/teacher/skyline-connect?compose=IDEA"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#003B3A] text-white hover:bg-[#00736E] shrink-0 transition-colors"
                >
                  + Đăng ngay
                </Link>
              </div>
            )}
          </div>

          {/* Right: Projects Seeking Collaborators */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-teal-100/80 border border-teal-200/80 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-[#00736E]" />
                </span>
                <span>Dự án tìm cộng sự</span>
              </span>
              <Link
                href="/teacher/skyline-connect/groups-projects"
                className="text-[#00736E] hover:text-[#003B3A] hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Nhóm & Dự án</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.openProjects && data.openProjects.length > 0 ? (
              <div className="space-y-2.5">
                {data.openProjects.slice(0, 2).map((proj) => (
                  <div
                    key={proj.id}
                    className="group relative p-3.5 rounded-xl border border-sky-200/80 bg-white/90 backdrop-blur-xs hover:bg-white hover:border-[#00A19A] hover:shadow-sm transition-all flex items-center justify-between gap-3 overflow-hidden"
                  >
                    <div className="absolute -bottom-2 -right-2 pointer-events-none opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                      <Share2 className="w-14 h-14 text-[#00736E]" />
                    </div>

                    <div className="min-w-0 relative z-10">
                      <Link
                        href={
                          proj.postId
                            ? `/teacher/skyline-connect/posts/${proj.postId}`
                            : `/teacher/skyline-connect/projects/${proj.id}`
                        }
                        className="text-xs sm:text-[13px] font-bold text-[#0F172A] group-hover:text-[#00736E] truncate block"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5 tabular-nums font-medium">
                        Chủ trì: {proj.leaderName} • Cần thêm {Math.max(1, proj.neededHeadcount)} cộng sự
                      </p>
                    </div>
                    <Link
                      href={
                        proj.postId
                          ? `/teacher/skyline-connect/posts/${proj.postId}`
                          : `/teacher/skyline-connect/projects/${proj.id}`
                      }
                      className="relative z-10 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#F0FDFA] text-[#003B3A] border border-[#99F6E4] hover:bg-[#00A19A] hover:text-white hover:border-[#00A19A] transition-colors shrink-0"
                    >
                      Tham gia
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative p-4 rounded-xl border border-dashed border-[#00A19A]/40 bg-white/85 backdrop-blur-xs flex items-center justify-between gap-3 overflow-hidden">
                <div className="absolute -right-2 -bottom-2 pointer-events-none opacity-[0.08]">
                  <Puzzle className="w-16 h-16 text-[#00736E]" />
                </div>
                <div className="flex items-center gap-3 min-w-0 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-[#00736E] flex items-center justify-center shrink-0">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#003B3A]">
                      Chưa có dự án đang mở tuyển cộng sự
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Khởi tạo dự án liên môn hoặc mời đồng nghiệp cùng phát triển sản phẩm AI.
                    </p>
                  </div>
                </div>
                <Link
                  href="/teacher/skyline-connect?compose=PROJECT"
                  className="relative z-10 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#99F6E4] text-[#003B3A] hover:bg-[#003B3A] hover:text-white hover:border-[#003B3A] shrink-0 transition-colors shadow-2xs"
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

