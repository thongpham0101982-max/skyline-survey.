'use client';

import React from 'react';

export type MascotVariant = 'guide' | 'notification' | 'celebration' | 'locked' | 'empty';

interface SkylineFlagMascotProps {
  variant?: MascotVariant;
  title?: string;
  message?: string;
  badgeText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  actionButton?: React.ReactNode;
}

/**
 * Linh vật Sky-Line cầm cờ (Sky-Line Mascot Holding Flag)
 * Sử dụng xuyên suốt trong:
 * 1. Hướng dẫn thực hiện tự đánh giá 5 phẩm chất & Pride NPS
 * 2. Thông báo mở kỳ / trạng thái kỳ khảo sát
 * 3. Màn hình hoàn thành bản tự nhìn nhận & lời mời phản hồi Pride NPS
 */
export function SkylineFlagMascot({
  variant = 'guide',
  title,
  message,
  badgeText,
  size = 'md',
  className = '',
  actionButton,
}: SkylineFlagMascotProps) {
  const variantStyles: Record<
    MascotVariant,
    {
      containerBg: string;
      border: string;
      badgeBg: string;
      flagColor: string;
      defaultBadge: string;
    }
  > = {
    guide: {
      containerBg: 'linear-gradient(135deg, #2E1065 0%, #5B2D8B 58%, #00A19A 100%)',
      border: 'border-purple-300/30',
      badgeBg: 'bg-amber-400 text-purple-950',
      flagColor: '#F59E0B',
      defaultBadge: 'LINH VẬT SKY-LINE DẪN ĐƯỜNG',
    },
    notification: {
      containerBg: 'linear-gradient(135deg, #3B0764 0%, #6D28D9 65%, #4F46E5 100%)',
      border: 'border-violet-300/30',
      badgeBg: 'bg-teal-400 text-slate-950',
      flagColor: '#14B8A6',
      defaultBadge: 'NHIỆM VỤ ĐANG MỞ • KHỐI 4–12',
    },
    celebration: {
      containerBg: 'linear-gradient(135deg, #1E1B4B 0%, #5B2D8B 50%, #0D9488 100%)',
      border: 'border-emerald-300/40',
      badgeBg: 'bg-emerald-400 text-emerald-950',
      flagColor: '#10B981',
      defaultBadge: 'HOÀN THÀNH XUẤT SẮC!',
    },
    locked: {
      containerBg: 'linear-gradient(135deg, #334155 0%, #475569 60%, #1E293B 100%)',
      border: 'border-slate-300/30',
      badgeBg: 'bg-slate-200 text-slate-800',
      flagColor: '#94A3B8',
      defaultBadge: 'CHƯA MỞ KỲ KHẢO SÁT',
    },
    empty: {
      containerBg: 'linear-gradient(135deg, #4C1D95 0%, #5B2D8B 70%, #312E81 100%)',
      border: 'border-purple-300/20',
      badgeBg: 'bg-purple-200 text-purple-950',
      flagColor: '#A78BFA',
      defaultBadge: 'SKY-LINE REFLECTION & PRIDE NPS',
    },
  };

  const style = variantStyles[variant] || variantStyles.guide;
  const svgSize = size === 'sm' ? 84 : size === 'lg' ? 132 : 108;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${style.border} text-white shadow-lg ${className}`}
      style={{ background: style.containerBg }}
    >
      {/* Họa tiết nền trang trí */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-teal-400/15 blur-2xl" />

      <div className="relative z-10 flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* Hình minh họa Linh vật Sky-Line cầm cờ SVG */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-center rounded-2xl bg-white/15 p-2.5 shadow-inner backdrop-blur-md ring-2 ring-white/25">
            <svg
              width={svgSize}
              height={svgSize}
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Linh vật Sky-Line cầm cờ"
            >
              {/* Hào quang phía sau */}
              <circle cx="64" cy="76" r="48" fill="white" fillOpacity="0.12" />
              <circle cx="64" cy="76" r="38" fill="white" fillOpacity="0.1" />

              {/* Cán cờ Sky-Line */}
              <line
                x1="98"
                y1="18"
                x2="94"
                y2="122"
                stroke="#FDE68A"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <circle cx="98" cy="16" r="5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="2" />

              {/* Lá cờ Sky-Line tung bay */}
              <path
                d="M98 21C110 17 122 25 134 21V53C122 57 110 49 96 53L98 21Z"
                fill={style.flagColor}
                stroke="#FEF3C7"
                strokeWidth="2"
              />
              {/* Ngôi sao & chữ SKL trên lá cờ */}
              <polygon
                points="115,28 117,33 122,33 118,36 119.5,41 115,38 110.5,41 112,36 108,33 113,33"
                fill="#FFFBEB"
              />
              <text
                x="104"
                y="49"
                fill="#FFFFFF"
                fontSize="7.5"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                SKY-LINE
              </text>

              {/* Thân linh vật Sky-Line (Áo đồng phục tím - viền ngọc) */}
              <path
                d="M40 96C40 82 50 74 62 74C74 74 84 82 84 96V116H40V96Z"
                fill="#5B2D8B"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              {/* Cổ áo V-neck Sky-Line */}
              <path d="M53 76L62 89L71 76" fill="#00A19A" stroke="#FFFFFF" strokeWidth="2" />
              {/* Huy hiệu ngực áo */}
              <circle cx="71" cy="95" r="4.5" fill="#F59E0B" stroke="#FFF" strokeWidth="1.2" />

              {/* Tay trái vẫy chào */}
              <path
                d="M40 86C31 82 26 74 28 67"
                stroke="#FDE68A"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Tay phải cầm cán cờ */}
              <path
                d="M82 86C89 84 93 78 96 72"
                stroke="#FDE68A"
                strokeWidth="7"
                strokeLinecap="round"
              />

              {/* Đầu Linh vật */}
              <circle
                cx="62"
                cy="52"
                r="23"
                fill="#FEF3C7"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />

              {/* Mũ Học viện Sky-Line */}
              <path
                d="M36 42L62 28L88 42L62 52L36 42Z"
                fill="#2E1065"
                stroke="#FDE68A"
                strokeWidth="2"
              />
              <path d="M46 46V54C46 54 54 58 62 58C70 58 78 54 78 54V46" fill="#4C1D95" />
              {/* Tua rua mũ vàng */}
              <path d="M84 43V56" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="84" cy="57" r="3" fill="#F59E0B" />

              {/* Đôi mắt sáng tự tin */}
              <circle cx="54" cy="54" r="3.2" fill="#1E1B4B" />
              <circle cx="70" cy="54" r="3.2" fill="#1E1B4B" />
              <circle cx="55" cy="53" r="1.1" fill="#FFFFFF" />
              <circle cx="71" cy="53" r="1.1" fill="#FFFFFF" />

              {/* Má hồng & Nụ cười rạng rỡ */}
              <ellipse cx="48" cy="59" rx="3.5" ry="2" fill="#FB7185" fillOpacity="0.55" />
              <ellipse cx="76" cy="59" rx="3.5" ry="2" fill="#FB7185" fillOpacity="0.55" />
              <path
                d="M55 61C57 65 67 65 69 61"
                stroke="#1E1B4B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Ngôi sao lấp lánh */}
              <circle cx="26" cy="36" r="2.5" fill="#FDE68A" />
              <circle cx="32" cy="24" r="1.8" fill="#5EEAD4" />
              <circle cx="116" cy="76" r="2.5" fill="#FDE68A" />
            </svg>
          </div>
        </div>

        {/* Nội dung thông điệp từ Linh vật */}
        <div className="flex-1 text-center sm:text-left">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-sm">
            <span className={`rounded-full px-2.5 py-0.5 ${style.badgeBg}`}>
              {badgeText || style.defaultBadge}
            </span>
          </div>
          {title && (
            <h3 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
              {title}
            </h3>
          )}
          {message && (
            <p className="mt-1.5 text-sm leading-relaxed text-purple-100/95 sm:text-[15px]">
              {message}
            </p>
          )}
          {actionButton && <div className="mt-3.5">{actionButton}</div>}
        </div>
      </div>
    </div>
  );
}
