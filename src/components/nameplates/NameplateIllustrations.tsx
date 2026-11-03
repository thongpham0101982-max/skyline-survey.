'use client';

import React from 'react';
import {
  NameplateColorPalette,
  NameplateIllustrationMode,
  NameplateTemplateId,
} from '@/lib/nameplates/types';
import { isMascotTemplate } from '@/lib/nameplates/config';

/**
 * Logo chính thức HỆ THỐNG GIÁO DỤC SKY-LINE chuẩn tỷ lệ thiết kế mẫu
 * (Chữ SKY-LINE đậm + cánh chim 2 tầng vươn cao bên phải + dòng HỆ THỐNG GIÁO DỤC SKY-LINE bên dưới)
 */
export function SkyLineOfficialLogo({
  palette,
  scale = 1,
}: {
  palette: NameplateColorPalette;
  scale?: number;
}) {
  const isPurple = palette.id === 'GLOBAL_PURPLE' || palette.id === 'CENTRAL_INDIGO';
  const wordmarkColor = isPurple ? '#482491' : '#0E8B9E';
  const wingLeftColor = isPurple ? '#6D35C7' : '#26B0C4';
  const wingRightColor = isPurple ? '#3F1D85' : '#0A7D8F';
  const subtitleColor = isPurple ? '#3B1E77' : '#1E4663';

  return (
    <div
      className="inline-flex flex-col items-center select-none"
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      {/* Dòng trên: SKY-LINE + Biểu tượng cánh chim vươn cao */}
      <div
        className="relative flex items-baseline justify-center"
        style={{ height: '9.2mm', paddingRight: '5.5mm' }}
      >
        <span
          style={{
            fontFamily: "'Montserrat', 'Plus Jakarta Sans', 'Arial Black', sans-serif",
            fontWeight: 900,
            fontSize: '4.1mm',
            letterSpacing: '0.05em',
            color: wordmarkColor,
            lineHeight: 1,
            transform: 'scaleX(1.16)',
            display: 'inline-block',
            marginTop: '3.9mm',
          }}
        >
          SKY-LINE
        </span>

        {/* Cánh chim Sky-Line vươn cao góc phải trên chữ E */}
        <svg
          viewBox="0 0 68 48"
          style={{
            width: '10.6mm',
            height: '7.5mm',
            position: 'absolute',
            right: '-2.6mm',
            top: '0.2mm',
            overflow: 'visible',
          }}
          aria-hidden="true"
        >
          {/* Cánh trái mềm mại */}
          <path
            d="M 4 19 C 14 18, 22 22, 27 31 C 30 23, 36 16, 44 10 C 35 14, 29 20, 26 26 C 20 19, 12 17, 4 19 Z"
            fill={wingLeftColor}
          />
          {/* Cánh phải lớn vươn cao */}
          <path
            d="M 19 25 C 25 27, 29 31, 31 37 C 37 22, 48 9, 66 2 C 52 7, 39 16, 30 29 C 27 26, 23 24, 19 25 Z"
            fill={wingRightColor}
          />
          {/* Đuôi chim chữ V nhỏ phía dưới */}
          <path
            d="M 25 38 L 30 44 L 35 37 L 31 41 Z"
            fill={wingLeftColor}
          />
        </svg>
      </div>

      {/* Dòng dưới: HỆ THỐNG GIÁO DỤC SKY-LINE */}
      <div
        style={{
          fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
          fontWeight: 600,
          fontSize: '2.35mm',
          letterSpacing: '0.22em',
          color: subtitleColor,
          marginTop: '0.4mm',
          whiteSpace: 'nowrap',
        }}
      >
        HỆ THỐNG GIÁO DỤC SKY-LINE
      </div>
    </div>
  );
}

/**
 * Biểu tượng cánh chim Sky-Line đặt ở tâm mã QR
 */
export function SkyLineBirdEmblem({
  color = '#0E869E',
  accentColor = '#26B0C4',
  sizeMm = 5.4,
}: {
  color?: string;
  accentColor?: string;
  sizeMm?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 52"
      style={{ width: `${sizeMm}mm`, height: `${sizeMm * 0.82}mm`, display: 'block' }}
      aria-hidden="true"
    >
      <path
        d="M 4 21 C 14 20, 22 24, 27 34 C 33 19, 45 7, 62 2 C 49 8, 37 18, 29 30 C 23 22, 14 19, 4 21 Z"
        fill={color}
      />
      <path
        d="M 23 37 L 28 45 L 34 36 L 29 41 Z"
        fill={accentColor}
      />
    </svg>
  );
}

/**
 * Icon Thẻ học sinh (ID Card Badge) đặt bên trái "Mã HS: 0701030404" (Mẫu 01-04)
 */
export function StudentIdCardIcon({
  color = '#0E869E',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 34"
      style={{ width: '8.2mm', height: '6.3mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <rect x="19" y="1" width="6" height="6" rx="2" fill={color} />
      <rect x="2" y="5" width="40" height="27" rx="5.5" fill={color} />
      <rect x="16" y="7.5" width="12" height="2.2" rx="1" fill="#FFFFFF" opacity="0.45" />
      <circle cx="13.5" cy="16.5" r="3.4" fill="#FFFFFF" />
      <path
        d="M 7.5 26.5 C 7.5 22.8, 10.2 21, 13.5 21 C 16.8 21, 19.5 22.8, 19.5 26.5 Z"
        fill="#FFFFFF"
      />
      <rect x="23" y="14" width="13" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.95" />
      <rect x="23" y="19" width="13" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.95" />
      <rect x="23" y="24" width="10" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

/**
 * Icon Hồ sơ Học sinh vuông bo góc màu tím-lam chuẩn Mẫu 05 & 06 (Linh vật Sky-Line)
 */
export function MascotUserBadgeIcon({
  color = '#5842F4',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      style={{ width: '6.4mm', height: '6.4mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="34" height="34" rx="9" fill={color} />
      <circle cx="18" cy="13.5" r="5.2" fill="#FFFFFF" />
      <path
        d="M 8.5 28.5 C 8.5 23.2, 12.6 20.5, 18 20.5 C 23.4 20.5, 27.5 23.2, 27.5 28.5 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Icon Mũ cử nhân (LỚP) chuẩn Mẫu 05 & 06
 */
export function MascotGraduationCapIcon({
  color = '#5842F4',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 28"
      style={{ width: '5.8mm', height: '5.1mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <path
        d="M 16 3 L 2 10.5 L 16 18 L 30 10.5 L 16 3 Z"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M 7.5 13.8 L 7.5 21.2 C 7.5 23.5, 11.4 25.5, 16 25.5 C 20.6 25.5, 24.5 23.5, 24.5 21.2 L 24.5 13.8"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 28.5 11.2 L 28.5 20.5"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Icon Quyển sách mở (BẬC HỌC) chuẩn Mẫu 05 & 06
 */
export function MascotOpenBookIcon({
  color = '#5842F4',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 28"
      style={{ width: '5.6mm', height: '4.9mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <path
        d="M 16 6.5 C 12.5 4.2, 7.2 3.8, 3 4.8 L 3 22.8 C 7.2 21.8, 12.5 22.2, 16 24.5 C 19.5 22.2, 24.8 21.8, 29 22.8 L 29 4.8 C 24.8 3.8, 19.5 4.2, 16 6.5 Z"
        fill="none"
        stroke={color}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <line x1="16" y1="6.5" x2="16" y2="24.5" stroke={color} strokeWidth="2.2" />
      <line x1="6.5" y1="10" x2="12.5" y2="10.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6.5" y1="14" x2="12.5" y2="14.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="25.5" y1="10" x2="19.5" y2="10.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="25.5" y1="14" x2="19.5" y2="14.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Icon Tòa nhà trường học (CƠ SỞ) chuẩn Mẫu 05 & 06
 */
export function MascotCampusBuildingIcon({
  color = '#5842F4',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 28"
      style={{ width: '5.5mm', height: '4.9mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <path
        d="M 9 25 L 9 9 L 16 4 L 23 9 L 23 25"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M 3 25 L 3 14 L 9 14 M 23 14 L 29 14 L 29 25"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="1.5" y1="25" x2="30.5" y2="25" stroke={color} strokeWidth="2.3" strokeLinecap="round" />
      <rect x="13.5" y="18.5" width="5" height="6.5" rx="0.8" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="16" cy="11.5" r="1.6" fill={color} />
    </svg>
  );
}

/**
 * Icon Lá mầm xanh đôi (Chủ đề năm học) chuẩn Mẫu 05 & 06
 */
export function MascotGreenLeafIcon() {
  return (
    <svg
      viewBox="0 0 30 26"
      style={{ width: '4.6mm', height: '4.0mm', flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      {/* Lá lớn bên phải */}
      <path
        d="M 13 22 C 13 13, 19 4, 28 3 C 28 13, 22 21, 13 22 Z"
        fill="#22C55E"
      />
      {/* Lá nhỏ bên trái */}
      <path
        d="M 13 22 C 6 20, 2 14, 3 7 C 10 8, 13 14, 13 22 Z"
        fill="#16A34A"
      />
      {/* Gân lá trắng mảnh */}
      <path
        d="M 13 22 C 16 16, 20 11, 24 7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Biểu tượng Trái tim kèm 3 tia sáng hai bên (≡ ♥ ≡) ở Mặt sau lời cảm ơn
 */
export function ThankYouHeartEmblem({
  color = '#0F6E84',
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 90 32"
      style={{ width: '15.5mm', height: '5.5mm', display: 'block' }}
      aria-hidden="true"
    >
      <line x1="12" y1="8" x2="21" y2="11" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="9" y1="16" x2="19" y2="16" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="12" y1="24" x2="21" y2="21" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M 45 27 C 45 27, 31 18.2, 31 10.5 C 31 6.4, 34.2 3.5, 38.2 3.5 C 41.1 3.5, 43.6 5.2, 45 7.6 C 46.4 5.2, 48.9 3.5, 51.8 3.5 C 55.8 3.5, 59 6.4, 59 10.5 C 59 18.2, 45 27, 45 27 Z"
        fill={color}
      />
      <line x1="78" y1="8" x2="69" y2="11" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="81" y1="16" x2="71" y2="16" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="78" y1="24" x2="69" y2="21" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Xác định giới tính hiển thị minh họa
 */
export function resolveStudentGender(
  gender?: string | null,
  fullName?: string,
  mode: NameplateIllustrationMode = 'STUDENT_PHOTO'
): 'GIRL' | 'BOY' | 'NONE' {
  if (mode === 'STUDENT_PHOTO' || mode === 'CAMPUS_ONLY') return 'NONE';
  if (mode === 'GIRL') return 'GIRL';
  if (mode === 'BOY') return 'BOY';

  const g = String(gender || '').toLowerCase().trim();
  if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') return 'GIRL';
  if (g === 'nam' || g === 'male' || g === 'm') return 'BOY';

  const name = String(fullName || '').toLowerCase();
  if (
    /\b(thị|ngọc|linh|anh|hân|nhi|vy|my|trang|thảo|hương|phương|trâm|lan|mai|châu|ngân|diệp|duyên|uyền|yến|quỳnh)\b/i.test(
      name
    )
  ) {
    return 'GIRL';
  }
  return 'BOY';
}

/**
 * Nền minh họa Mặt trước (210 × 70 mm) sử dụng trực tiếp artwork chuẩn từ mẫu thiết kế cung cấp
 */
export function FrontSideArtwork({
  templateId,
  palette,
  gender,
  ecoInkMode = false,
}: {
  templateId: NameplateTemplateId;
  palette: NameplateColorPalette;
  gender: 'GIRL' | 'BOY' | 'NONE';
  ecoInkMode?: boolean;
}) {
  const isMascot = isMascotTemplate(templateId);
  const isPurpleFamily = palette.id === 'GLOBAL_PURPLE' || palette.id === 'CENTRAL_INDIGO';

  if (isMascot) {
    let filterStyle = 'none';
    if (ecoInkMode) {
      filterStyle = 'opacity(0.76) contrast(0.96) brightness(1.05)';
    } else if (palette.id === 'GLOBAL_PURPLE') {
      filterStyle = 'hue-rotate(14deg) saturate(1.04)';
    }

    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        data-template={templateId}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '210mm',
          height: '70mm',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <img
          src="/images/nameplates/mascot-front-bg.png"
          alt=""
          draggable={false}
          style={{
            width: '210mm',
            height: '70mm',
            maxWidth: 'none',
            objectFit: 'fill',
            display: 'block',
            filter: filterStyle,
          }}
        />

        {/* Với Mẫu 06 (Linh vật cầm Điện thoại QR), hiển thị thêm chú chim 3D cầm điện thoại ở góc phải dưới cạnh khung QR */}
        {templateId === 'MODEL_06_MASCOT_PHONE' && (
          <img
            src="/images/nameplates/mascot-phone-bird.png"
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              right: '34.5mm',
              bottom: '2.2mm',
              width: '24.5mm',
              height: '23.2mm',
              objectFit: 'contain',
              display: 'block',
              zIndex: 4,
              filter: 'drop-shadow(0 1.2mm 2.5mm rgba(15, 23, 42, 0.18))',
            }}
          />
        )}
      </div>
    );
  }

  let bgSrc = '/images/nameplates/teal-front-girl.png';
  if (isPurpleFamily) {
    if (gender === 'NONE') bgSrc = '/images/nameplates/purple-front-campus.png';
    else if (gender === 'BOY') bgSrc = '/images/nameplates/purple-front-boy.png';
    else bgSrc = '/images/nameplates/purple-front-girl.png';
  } else {
    if (gender === 'NONE') bgSrc = '/images/nameplates/teal-front-campus.png';
    else if (gender === 'BOY') bgSrc = '/images/nameplates/teal-front-boy.png';
    else bgSrc = '/images/nameplates/teal-front-girl.png';
  }

  let filterStyle = 'none';
  if (ecoInkMode) {
    filterStyle = 'opacity(0.72) contrast(0.95) brightness(1.06)';
  } else if (palette.id === 'CENTRAL_INDIGO') {
    filterStyle = 'hue-rotate(-22deg) saturate(1.05)';
  } else if (palette.id === 'BEACH_BLUE') {
    filterStyle = 'hue-rotate(12deg) saturate(1.08)';
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      data-template={templateId}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '210mm',
        height: '70mm',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <img
        src={bgSrc}
        alt=""
        draggable={false}
        style={{
          width: '210mm',
          height: '70mm',
          maxWidth: 'none',
          objectFit: 'fill',
          display: 'block',
          filter: filterStyle,
        }}
      />

      {/* Lớp phủ Vector SVG độ phân giải vô cực (Infinite DPI) làm sắc nét 100% sóng phải, slogan, ngôi sao, máy bay giấy & lá trang trí khi xuất PDF */}
      <svg
        viewBox="0 0 2100 700"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '210mm',
          height: '70mm',
          display: 'block',
          opacity: ecoInkMode ? 0.75 : 1,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`front-right-wave-${palette.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isPurpleFamily ? '#8B5CF6' : '#1BA8BC'} />
            <stop offset="52%" stopColor={isPurpleFamily ? '#6D28D9' : '#0E869E'} />
            <stop offset="100%" stopColor={isPurpleFamily ? '#4C1D95' : '#085E73'} />
          </linearGradient>
          <linearGradient id={`front-right-soft-${palette.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isPurpleFamily ? '#EDE9FE' : '#E0F5F9'} stopOpacity="0.92" />
            <stop offset="100%" stopColor={isPurpleFamily ? '#C4B5FD' : '#9CE0EC'} stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="gold-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="55%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>

        <path
          d="M 1360 0 C 1490 50, 1560 155, 1655 245 C 1750 335, 1910 380, 2100 410 L 2100 700 L 1220 700 C 1380 650, 1510 580, 1620 495 C 1710 425, 1650 220, 1360 0 Z"
          fill={`url(#front-right-soft-${palette.id})`}
        />
        <path
          d="M 1420 0 L 2100 0 L 2100 700 L 1320 700 C 1495 660, 1645 600, 1775 510 C 1885 435, 1985 335, 2045 235 C 1885 210, 1735 160, 1595 85 C 1525 48, 1468 20, 1420 0 Z"
          fill={`url(#front-right-wave-${palette.id})`}
        />
        <path
          d="M 1395 0 C 1540 95, 1720 185, 2050 250"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeOpacity="0.65"
        />
        <path
          d="M 1290 700 C 1510 645, 1740 545, 2100 425"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeOpacity="0.72"
        />

        <text
          x="1948"
          y="58"
          textAnchor="end"
          fill="#FFFFFF"
          fontFamily="'Montserrat', 'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="26"
          letterSpacing="1.2"
        >
          GLOBAL MINDSET
        </text>
        <text
          x="1948"
          y="90"
          textAnchor="end"
          fill="#FFFFFF"
          fontFamily="'Montserrat', 'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="26"
          letterSpacing="1.2"
        >
          BRIGHTER FUTURE
        </text>

        <g transform="translate(1966, 36)">
          <path
            d="M 32 4 L 40.5 21.5 L 59.8 24.3 L 45.8 37.9 L 49.1 57.1 L 32 48.1 L 14.9 57.1 L 18.2 37.9 L 4.2 24.3 L 23.5 21.5 Z"
            fill="url(#gold-star-grad)"
            stroke="#FEF08A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>

        <g transform="translate(655, 48) rotate(-8)">
          <polygon points="0,34 68,0 44,58 29,40" fill={isPurpleFamily ? '#5B8DEF' : '#189AB4'} />
          <polygon points="29,40 68,0 35,48" fill={isPurpleFamily ? '#3B5BDB' : '#0A6E82'} />
          <polygon points="0,34 29,40 68,0" fill={isPurpleFamily ? '#74A0F7' : '#38BDF8'} />
        </g>

        <g transform="translate(1995, 560)">
          <path
            d="M 18 95 C 8 65, 14 30, 38 8 C 46 38, 40 70, 18 95 Z"
            fill={isPurpleFamily ? '#A78BFA' : '#56C2D6'}
            opacity="0.85"
          />
          <path
            d="M 24 98 C 40 72, 68 54, 95 48 C 78 76, 52 94, 24 98 Z"
            fill={isPurpleFamily ? '#7C3AED' : '#0E869E'}
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Nền minh họa Mặt sau (210 × 70 mm)
 */
export function BackSideArtwork({
  templateId,
  palette,
  ecoInkMode = false,
}: {
  templateId: NameplateTemplateId;
  palette: NameplateColorPalette;
  ecoInkMode?: boolean;
}) {
  const isMascot = isMascotTemplate(templateId);
  const isPurpleFamily = palette.id === 'GLOBAL_PURPLE' || palette.id === 'CENTRAL_INDIGO';

  if (isMascot) {
    let filterStyle = 'none';
    if (ecoInkMode) {
      filterStyle = 'opacity(0.76) contrast(0.96) brightness(1.05)';
    } else if (palette.id === 'GLOBAL_PURPLE') {
      filterStyle = 'hue-rotate(14deg) saturate(1.04)';
    }

    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        data-template={templateId}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '210mm',
          height: '70mm',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <img
          src="/images/nameplates/mascot-back-bg.png"
          alt=""
          draggable={false}
          style={{
            width: '210mm',
            height: '70mm',
            maxWidth: 'none',
            objectFit: 'fill',
            display: 'block',
            filter: filterStyle,
          }}
        />
      </div>
    );
  }

  const bgSrc = isPurpleFamily
    ? '/images/nameplates/purple-back.png'
    : '/images/nameplates/teal-back.png';

  let filterStyle = 'none';
  if (ecoInkMode) {
    filterStyle = 'opacity(0.72) contrast(0.95) brightness(1.06)';
  } else if (palette.id === 'CENTRAL_INDIGO') {
    filterStyle = 'hue-rotate(-22deg) saturate(1.05)';
  } else if (palette.id === 'BEACH_BLUE') {
    filterStyle = 'hue-rotate(12deg) saturate(1.08)';
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      data-template={templateId}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '210mm',
        height: '70mm',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <img
        src={bgSrc}
        alt=""
        draggable={false}
        style={{
          width: '210mm',
          height: '70mm',
          maxWidth: 'none',
          objectFit: 'fill',
          display: 'block',
          filter: filterStyle,
        }}
      />

      <svg
        viewBox="0 0 2100 700"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '210mm',
          height: '70mm',
          display: 'block',
          opacity: ecoInkMode ? 0.75 : 1,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`back-right-wave-${palette.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isPurpleFamily ? '#8B5CF6' : '#22B8CF'} />
            <stop offset="55%" stopColor={isPurpleFamily ? '#6D28D9' : '#0E869E'} />
            <stop offset="100%" stopColor={isPurpleFamily ? '#4C1D95' : '#085E73'} />
          </linearGradient>
        </defs>

        <path
          d="M 1640 0 L 2100 0 L 2100 700 L 1540 700 C 1690 640, 1810 535, 1875 415 C 1935 305, 1895 170, 1790 85 C 1735 40, 1685 15, 1640 0 Z"
          fill={`url(#back-right-wave-${palette.id})`}
        />
        <path
          d="M 1500 700 C 1685 645, 1845 555, 2100 440"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeOpacity="0.68"
        />

        <g fill="#FFFFFF" fontFamily="'Montserrat', 'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="23" letterSpacing="1.5" textAnchor="end">
          <text x="2045" y="78">LEARN</text>
          <text x="2045" y="110">GROW</text>
          <text x="2045" y="142">SHINE</text>
          <text x="2045" y="174">TOGETHER</text>
        </g>

        <path
          d="M 2065 118 L 2070 130 L 2082 135 L 2070 140 L 2065 152 L 2060 140 L 2048 135 L 2060 130 Z"
          fill="#FDE047"
        />

        <g transform="translate(565, 170) scale(0.55)">
          <path
            d="M 4 21 C 14 20, 22 24, 27 34 C 33 19, 45 7, 62 2 C 49 8, 37 18, 29 30 C 23 22, 14 19, 4 21 Z"
            fill={isPurpleFamily ? '#5B21B6' : '#0E869E'}
          />
        </g>
        <g transform="translate(495, 290) scale(0.45)">
          <path
            d="M 4 21 C 14 20, 22 24, 27 34 C 33 19, 45 7, 62 2 C 49 8, 37 18, 29 30 C 23 22, 14 19, 4 21 Z"
            fill={isPurpleFamily ? '#6D28D9' : '#18A5B8'}
          />
        </g>
      </svg>
    </div>
  );
}
