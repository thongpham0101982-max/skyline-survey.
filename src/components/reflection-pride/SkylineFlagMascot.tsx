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
      containerBg: 'linear-gradient(135deg, #003B3A 0%, #003B3A 58%, #00A19A 100%)',
      border: 'border-teal-300/30',
      badgeBg: 'bg-amber-400 text-teal-800',
      flagColor: '#F59E0B',
      defaultBadge: 'LINH VẬT SKY-LINE DẪN ĐƯỜNG',
    },
    notification: {
      containerBg: 'linear-gradient(135deg, #3B0764 0%, #6D28D9 65%, #00736E 100%)',
      border: 'border-teal-300/30',
      badgeBg: 'bg-teal-400 text-slate-950',
      flagColor: '#14B8A6',
      defaultBadge: 'NHIỆM VỤ ĐANG MỞ • KHỐI 4–12',
    },
    celebration: {
      containerBg: 'linear-gradient(135deg, #1E1B4B 0%, #003B3A 50%, #0D9488 100%)',
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
      containerBg: 'linear-gradient(135deg, #4C1D95 0%, #003B3A 70%, #312E81 100%)',
      border: 'border-teal-300/20',
      badgeBg: 'bg-teal-50 text-teal-800',
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
        {/* Hình minh họa Linh vật Sky-Line cầm cờ 3D chính thức */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-center rounded-2xl bg-white/15 p-2 shadow-inner backdrop-blur-md ring-2 ring-white/25">
            <img
              src="/images/skyline-mascot-flag.png"
              alt="Linh vật Sky-Line cầm cờ"
              width={svgSize}
              height={svgSize}
              style={{ width: svgSize, height: svgSize }}
              className="object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
            />
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
            <p className="mt-1.5 text-sm leading-relaxed text-teal-700/95 sm:text-[15px]">
              {message}
            </p>
          )}
          {actionButton && <div className="mt-3.5">{actionButton}</div>}
        </div>
      </div>
    </div>
  );
}
