'use client';

import React, { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  NameplatePrintConfig,
  NameplateStudentItem,
} from '@/lib/nameplates/types';
import {
  NAMEPLATE_COLOR_THEMES,
  NAMEPLATE_TEMPLATES,
  formatCleanClassName,
  getAdaptiveStudentNameStyle,
  isMascotTemplate,
  resolveLevelDisplayLabel,
} from '@/lib/nameplates/config';
import {
  BackSideArtwork,
  FrontSideArtwork,
  MascotCampusBuildingIcon,
  MascotGraduationCapIcon,
  MascotGreenLeafIcon,
  MascotOpenBookIcon,
  MascotUserBadgeIcon,
  SkyLineBirdEmblem,
  SkyLineOfficialLogo,
  StudentIdCardIcon,
  ThankYouHeartEmblem,
  resolveStudentGender,
} from './NameplateIllustrations';

const qrDataUrlCache = new Map<string, string>();

/**
 * MẶT TRƯỚC BẢNG TÊN – THÔNG TIN HỌC SINH
 * Kích thước vật lý chuẩn: 210mm × 70mm (21 × 7 cm)
 * Bám sát 100% thiết kế mẫu cung cấp (Mẫu 01-04 & Mẫu 05-06 Linh vật Sky-Line)
 */
export function NameplateFrontFace({
  student,
  config,
  campusShortLabel,
  inspectMode = false,
}: {
  student: NameplateStudentItem;
  config: NameplatePrintConfig;
  campusShortLabel?: string;
  inspectMode?: boolean;
}) {
  const palette =
    NAMEPLATE_COLOR_THEMES[config.colorThemeId] || NAMEPLATE_COLOR_THEMES.SKYLINE_TEAL;
  const template =
    NAMEPLATE_TEMPLATES[config.templateId] || NAMEPLATE_TEMPLATES.MODEL_05_MASCOT;
  const isMascot = isMascotTemplate(config.templateId);

  const displayFullName = student.studentName || student.fullName || 'Trịnh Minh Châu';
  const displayCode = student.studentCode || student.code || '0601012084';
  const displayCampusShort = (
    campusShortLabel ||
    student.campusCode ||
    'CS1'
  ).toUpperCase();

  const fallbackGender = resolveStudentGender(
    student.gender,
    displayFullName,
    config.illustrationMode === 'STUDENT_PHOTO_FALLBACK'
      ? 'AUTO_GENDER'
      : config.illustrationMode
  );

  const photoSrc =
    student.photoUrl ||
    `/api/student-photos/${encodeURIComponent(student.id || displayCode)}?code=${encodeURIComponent(displayCode)}`;

  const [photoLoadFailed, setPhotoLoadFailed] = useState<boolean>(
    student.hasPortalPhoto === false
  );

  useEffect(() => {
    setPhotoLoadFailed(student.hasPortalPhoto === false);
  }, [photoSrc, student.hasPortalPhoto]);

  const showStudentPortalPhotoFrame =
    isMascot ||
    config.illustrationMode === 'STUDENT_PHOTO' ||
    (config.illustrationMode === 'STUDENT_PHOTO_FALLBACK' && !photoLoadFailed);

  const artworkGender: 'GIRL' | 'BOY' | 'NONE' = showStudentPortalPhotoFrame
    ? 'NONE'
    : fallbackGender;

  const nameStyle = getAdaptiveStudentNameStyle(displayFullName, config.templateId);
  const levelLabel = resolveLevelDisplayLabel(
    student.level,
    student.grade || student.className
  );
  const cleanClass = formatCleanClassName(student.className);
  const isPurple =
    palette.id === 'GLOBAL_PURPLE' || palette.id === 'CENTRAL_INDIGO';

  const qrCaptionText =
    config.qrCaption && config.qrCaption.trim()
      ? config.qrCaption.trim()
      : 'Xem hồ sơ học sinh';

  const yearThemeText =
    (config.backMotto && config.backMotto.trim()) ||
    (student.academicYearTheme && student.academicYearTheme.trim()) ||
    'Vững nội lực - Hướng tương lai';

  const verifyUrl =
    student.verifyUrl ||
    `https://ssm.skylineschool.edu.vn/profile/verify/${encodeURIComponent(displayCode)}`;
  const cacheKey = `${verifyUrl}|${palette.qrDarkColor}`;

  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>(
    () => student.qrDataUrl || qrDataUrlCache.get(cacheKey) || ''
  );

  useEffect(() => {
    if (student.qrDataUrl) {
      setGeneratedQrUrl(student.qrDataUrl);
      return;
    }
    const cached = qrDataUrlCache.get(cacheKey);
    if (cached) {
      setGeneratedQrUrl(cached);
      return;
    }
    let mounted = true;
    QRCode.toDataURL(verifyUrl, {
      width: 960,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: {
        dark: palette.qrDarkColor || '#111827',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        qrDataUrlCache.set(cacheKey, dataUrl);
        if (mounted) setGeneratedQrUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [verifyUrl, cacheKey, student.qrDataUrl, palette.qrDarkColor]);

  // ===========================================================================
  // BỐ CỤC MẪU 05 & MẪU 06 – LINH VẬT CHIM SKY-LINE 3D (BÁM SÁT 100% MẪU MỚI)
  // ===========================================================================
  if (isMascot) {
    return (
      <div
        className="relative overflow-hidden select-none"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '210mm',
          height: '70mm',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <FrontSideArtwork
          templateId={config.templateId}
          palette={palette}
          gender="NONE"
          ecoInkMode={config.ecoInkMode}
        />

        {/* BÊN TRÁI: KHUNG ẢNH HỌC SINH TỪ CỔNG ẢNH HS NẰM TRONG KHUNG VIỀN ĐÔI + NGÔI SAO VÀNG GÓC TRÁI TRÊN */}
        <div
          className="absolute z-10 flex items-center justify-center"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '10.0mm',
            top: '16.9mm',
            width: '30.3mm',
            height: '38.2mm',
          }}
        >
          <div
            className="relative w-full h-full overflow-hidden bg-white flex flex-col items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderRadius: '3.6mm',
              backgroundColor: '#F0F9FF',
            }}
          >
            {!photoLoadFailed ? (
              <img
                src={photoSrc}
                alt={displayFullName}
                onError={() => setPhotoLoadFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  objectFit: 'cover',
                  objectPosition: 'center 15%',
                  display: 'block',
                  filter: 'contrast(1.04) saturate(1.04)',
                }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-between text-center"
                style={{
                  background:
                    'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 55%, #DBEAFE 100%)',
                  paddingTop: '2.5mm',
                  paddingBottom: '1.8mm',
                  paddingLeft: '1.5mm',
                  paddingRight: '1.5mm',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '1.75mm',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#0284C7',
                    textTransform: 'uppercase',
                  }}
                >
                  CỔNG ẢNH HỌC SINH
                </span>

                <svg
                  viewBox="0 0 120 135"
                  style={{ width: '24mm', height: '26mm', display: 'block' }}
                  aria-hidden="true"
                >
                  <circle cx="60" cy="46" r="32" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="60" cy="44" r="20" fill="#7DD3FC" />
                  <path
                    d="M 18 130 C 18 93, 35 78, 60 78 C 85 78, 102 93, 102 130 Z"
                    fill="#FFFFFF"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 43 79 L 60 98 L 77 79 L 69 76 L 60 88 L 51 76 Z"
                    fill="#0284C7"
                  />
                </svg>

                <span
                  style={{
                    fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
                    fontSize: '1.85mm',
                    fontWeight: 700,
                    color: '#0A1158',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    padding: '0.4mm 1.8mm',
                    borderRadius: '9999px',
                  }}
                >
                  Chưa có ảnh Cổng HS
                </span>
              </div>
            )}
          </div>

          {/* Ngôi sao viền vàng đè lên góc trên bên trái của khung ảnh học sinh chuẩn 100% mẫu */}
          <svg
            viewBox="0 0 44 44"
            style={{
              position: 'absolute',
              left: '-3.1mm',
              top: '-3.3mm',
              width: '6.8mm',
              height: '6.8mm',
              zIndex: 20,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
            aria-hidden="true"
          >
            <path
              d="M 22 3 L 27.2 14.2 L 39.5 15.8 L 30.4 24.4 L 32.7 36.6 L 22 30.7 L 11.3 36.6 L 13.6 24.4 L 4.5 15.8 L 16.8 14.2 Z"
              fill="#FFFFFF"
              stroke="#FBBF24"
              strokeWidth="3.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* VÙNG TRUNG TÂM MẪU LINH VẬT: HỌ TÊN + PILL MÃ HS + 3 CỘT ICON (LỚP | BẬC HỌC | CƠ SỞ) + PILL LÁ XANH CHỦ ĐỀ NĂM HỌC */}
        <div
          className="absolute flex flex-col items-center justify-start text-center z-10"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '44.0mm',
            right: config.templateId === 'MODEL_06_MASCOT_PHONE' ? '56.0mm' : '49.5mm',
            top: '15.2mm',
            bottom: '13.5mm',
          }}
        >
          {/* 1. Họ và tên học sinh – chữ lớn tròn đậm màu Navy (#0A1158) */}
          <div
            className="w-full flex items-center justify-center"
            style={{
              minHeight: '11.5mm',
              maxHeight: '14.5mm',
            }}
          >
            <div
              style={{
                fontFamily: template.fontFamilyHeading,
                fontWeight: 800,
                fontSize: `${nameStyle.fontSizeMm}mm`,
                lineHeight: 1.15,
                letterSpacing: nameStyle.letterSpacing,
                color: '#0A1158',
                whiteSpace: nameStyle.allowWrap ? 'normal' : 'nowrap',
                wordBreak: 'keep-all',
                textRendering: 'geometricPrecision',
              }}
            >
              {displayFullName}
            </div>
          </div>

          {/* 2. Pill Mã HS: Icon vuông bo góc tím (#5842F4) + Mã HS: 0601012084 */}
          <div
            className="inline-flex items-center justify-center"
            style={{
              marginTop: '1.4mm',
              height: '8.4mm',
              paddingLeft: '1.8mm',
              paddingRight: '4.8mm',
              borderRadius: '9999px',
              backgroundColor: config.ecoInkMode ? '#F8FAFC' : '#F1EFFC',
              border: config.ecoInkMode ? '0.25mm solid #5842F4' : 'none',
              gap: '2.2mm',
            }}
          >
            <MascotUserBadgeIcon color="#5842F4" />

            <span
              style={{
                fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
                fontSize: '3.95mm',
                fontWeight: 600,
                color: '#5E548E',
                letterSpacing: '0.01em',
                lineHeight: 1,
              }}
            >
              Mã HS:{' '}
              <strong
                style={{
                  fontWeight: 800,
                  fontSize: '4.35mm',
                  color: '#1E1B8B',
                  letterSpacing: '0.02em',
                }}
              >
                {displayCode}
              </strong>
            </span>
          </div>

          {/* 3. Hàng 3 cột thông tin kèm Icon & Vạch ngăn cách: LỚP | BẬC HỌC | CƠ SỞ */}
          <div
            className="inline-flex items-center justify-center"
            style={{
              marginTop: '2.3mm',
              gap: '4.2mm',
            }}
          >
            {/* Cột 1: LỚP */}
            <div className="inline-flex items-center" style={{ gap: '1.6mm' }}>
              <MascotGraduationCapIcon color="#5842F4" />
              <div className="flex flex-col items-start text-left" style={{ lineHeight: 1.08 }}>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '2.05mm',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                  }}
                >
                  LỚP
                </span>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '3.25mm',
                    fontWeight: 800,
                    color: '#0A1158',
                  }}
                >
                  {cleanClass}
                </span>
              </div>
            </div>

            {/* Vạch ngăn cách 1 */}
            <div
              style={{
                width: '0.28mm',
                height: '6.0mm',
                backgroundColor: '#CBD5E1',
              }}
            />

            {/* Cột 2: BẬC HỌC */}
            <div className="inline-flex items-center" style={{ gap: '1.6mm' }}>
              <MascotOpenBookIcon color="#5842F4" />
              <div className="flex flex-col items-start text-left" style={{ lineHeight: 1.08 }}>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '2.05mm',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                  }}
                >
                  BẬC HỌC
                </span>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '3.25mm',
                    fontWeight: 800,
                    color: '#0A1158',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {levelLabel}
                </span>
              </div>
            </div>

            {/* Vạch ngăn cách 2 */}
            <div
              style={{
                width: '0.28mm',
                height: '6.0mm',
                backgroundColor: '#CBD5E1',
              }}
            />

            {/* Cột 3: CƠ SỞ */}
            <div className="inline-flex items-center" style={{ gap: '1.6mm' }}>
              <MascotCampusBuildingIcon color="#5842F4" />
              <div className="flex flex-col items-start text-left" style={{ lineHeight: 1.08 }}>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '2.05mm',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                  }}
                >
                  CƠ SỞ
                </span>
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '3.25mm',
                    fontWeight: 800,
                    color: '#0A1158',
                  }}
                >
                  {displayCampusShort}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Khung viên thuốc Chủ đề năm học kèm Icon lá mầm xanh đôi chuẩn mẫu */}
          <div
            className="inline-flex items-center justify-center"
            style={{
              marginTop: '2.2mm',
              height: '6.6mm',
              paddingLeft: '3.2mm',
              paddingRight: '3.8mm',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '0.32mm solid #7DD3FC',
              gap: '1.5mm',
              whiteSpace: 'nowrap',
            }}
          >
            <MascotGreenLeafIcon />
            <span
              style={{
                fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
                fontSize: '2.45mm',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Chủ đề năm học:{' '}
              <strong
                style={{
                  fontWeight: 800,
                  fontSize: '2.55mm',
                  color: '#0098C6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em',
                }}
              >
                {yearThemeText}
              </strong>
            </span>
          </div>
        </div>

        {/* BÊN PHẢI: VÙNG MÃ QR NẰM TRONG KHUNG TRẮNG VIỀN TÍM ĐƯỢC LINH VẬT CHIM SKY-LINE VỊN TAY */}
        <div
          className="absolute z-10 flex flex-col items-center justify-between"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '174.6mm',
            top: '34.5mm',
            width: '28.0mm',
            height: '23.8mm',
            paddingTop: '0.3mm',
            paddingBottom: '0.2mm',
            boxSizing: 'border-box',
          }}
        >
          {/* Khung QR + 4 góc ngắm màu xanh Cyan (#00A8E8) chuẩn mẫu */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: '19.6mm', height: '19.6mm' }}
          >
            <span
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderTop: '0.55mm solid #00A8E8',
                borderLeft: '0.55mm solid #00A8E8',
                borderTopLeftRadius: '0.9mm',
              }}
            />
            <span
              className="absolute top-0 right-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderTop: '0.55mm solid #00A8E8',
                borderRight: '0.55mm solid #00A8E8',
                borderTopRightRadius: '0.9mm',
              }}
            />
            <span
              className="absolute bottom-0 left-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderBottom: '0.55mm solid #00A8E8',
                borderLeft: '0.55mm solid #00A8E8',
                borderBottomLeftRadius: '0.9mm',
              }}
            />
            <span
              className="absolute bottom-0 right-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderBottom: '0.55mm solid #00A8E8',
                borderRight: '0.55mm solid #00A8E8',
                borderBottomRightRadius: '0.9mm',
              }}
            />

            {student.qrStatus === 'DISABLED' ? (
              <div
                className="flex flex-col items-center justify-center text-center bg-slate-50 rounded border border-dashed border-slate-300"
                style={{ width: '17.6mm', height: '17.6mm', padding: '1mm' }}
              >
                <span
                  style={{
                    fontSize: '1.8mm',
                    fontWeight: 700,
                    color: '#64748B',
                    lineHeight: 1.2,
                  }}
                >
                  QR tạm khóa
                </span>
              </div>
            ) : (
              <div
                className="relative flex items-center justify-center"
                style={{ width: '17.8mm', height: '17.8mm' }}
              >
                {generatedQrUrl ? (
                  <img
                    src={generatedQrUrl}
                    alt={`QR ${displayCode}`}
                    style={{
                      width: '17.8mm',
                      height: '17.8mm',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full bg-slate-100 rounded animate-pulse"
                    style={{ width: '17.8mm', height: '17.8mm' }}
                  />
                )}

                <div
                  className="absolute flex items-center justify-center bg-white rounded-full"
                  style={{
                    width: '4.4mm',
                    height: '4.4mm',
                    boxShadow: '0 0 0 0.35mm #FFFFFF',
                  }}
                >
                  <SkyLineBirdEmblem
                    color="#0098C6"
                    accentColor="#38BDF8"
                    sizeMm={3.5}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className="text-center w-full"
            style={{
              fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
              fontSize: '2.35mm',
              fontWeight: 800,
              color: '#1E1B8B',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {qrCaptionText}
          </div>
        </div>

        {inspectMode && (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{ border: '0.3mm dashed #EF4444' }}
          >
            <span
              className="absolute top-1 left-2 bg-red-600 text-white px-1.5 py-0.5 rounded font-mono"
              style={{ fontSize: '2.1mm' }}
            >
              MẶT TRƯỚC (MẪU LINH VẬT): 210 × 70 mm (21 × 7 cm)
            </span>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // BỐ CỤC MẪU 01 – 04 TRUYỀN THỐNG
  // ===========================================================================
  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '210mm',
        height: '70mm',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <FrontSideArtwork
        templateId={config.templateId}
        palette={palette}
        gender={artworkGender}
        ecoInkMode={config.ecoInkMode}
      />

      {showStudentPortalPhotoFrame && (
        <div
          className="absolute z-10 flex items-center justify-center"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '12.5mm',
            top: '8.5mm',
            width: '39.0mm',
            height: '52.0mm',
          }}
        >
          <div
            className="relative w-full h-full overflow-hidden bg-white flex flex-col items-center justify-center"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderRadius: '5.5mm',
              border: '1.35mm solid #FFFFFF',
              boxShadow: config.ecoInkMode
                ? `0 0 0 0.4mm ${palette.primaryMain}`
                : `0 0 0 0.45mm ${palette.primaryMain}, 0 2.5mm 6mm rgba(10, 54, 99, 0.22)`,
              backgroundColor: isPurple ? '#F5F3FF' : '#F0FDFA',
            }}
          >
            {!photoLoadFailed ? (
              <img
                src={photoSrc}
                alt={displayFullName}
                onError={() => setPhotoLoadFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  objectFit: 'cover',
                  objectPosition: 'center 15%',
                  display: 'block',
                  filter: 'contrast(1.04) saturate(1.04)',
                }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-between text-center"
                style={{
                  background: isPurple
                    ? 'linear-gradient(180deg, #F0FDFA 0%, #F5F3FF 55%, #CCFBF1 100%)'
                    : 'linear-gradient(180deg, #E0F2FE 0%, #F0FDFA 55%, #CCFBF1 100%)',
                  paddingTop: '3.5mm',
                  paddingBottom: '2.2mm',
                  paddingLeft: '2mm',
                  paddingRight: '2mm',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
                    fontSize: '1.95mm',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: palette.primaryMain,
                    textTransform: 'uppercase',
                  }}
                >
                  CỔNG ẢNH HỌC SINH
                </span>

                <svg
                  viewBox="0 0 120 135"
                  style={{ width: '31mm', height: '35mm', display: 'block' }}
                  aria-hidden="true"
                >
                  <circle cx="60" cy="46" r="34" fill="#FFFFFF" opacity="0.75" />
                  <circle cx="60" cy="44" r="21" fill={isPurple ? '#C4B5FD' : '#7DD3FC'} />
                  <path
                    d="M 18 130 C 18 93, 35 78, 60 78 C 85 78, 102 93, 102 130 Z"
                    fill="#FFFFFF"
                    stroke={palette.primaryMain}
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 43 79 L 60 98 L 77 79 L 69 76 L 60 88 L 51 76 Z"
                    fill={palette.primaryMain}
                  />
                  <path
                    d="M 71 102 C 74 101, 77 103, 79 106 C 81 101, 85 97, 90 95 C 86 97, 82 100, 79 104 C 77 101, 74 100, 71 102 Z"
                    fill={palette.primaryMain}
                  />
                </svg>

                <span
                  style={{
                    fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
                    fontSize: '2.05mm',
                    fontWeight: 700,
                    color: palette.nameColor,
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    padding: '0.6mm 2.2mm',
                    borderRadius: '9999px',
                  }}
                >
                  Chưa có ảnh Cổng HS
                </span>
              </div>
            )}
          </div>

          <div
            className="absolute flex items-center justify-center bg-white rounded-full"
            style={{
              right: '-1.8mm',
              bottom: '-1.5mm',
              width: '7.6mm',
              height: '7.6mm',
              border: `0.45mm solid ${palette.primaryMain}`,
              boxShadow: '0 1mm 2.5mm rgba(0,0,0,0.14)',
            }}
          >
            <SkyLineBirdEmblem
              color={isPurple ? '#482491' : '#0E869E'}
              accentColor={isPurple ? '#6D35C7' : '#26B0C4'}
              sizeMm={4.8}
            />
          </div>
        </div>
      )}

      <div
        className="absolute inset-y-0 flex flex-col items-center justify-start text-center z-10"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          zIndex: 10,
          left: '58mm',
          right: '38.5mm',
          paddingTop: '1.8mm',
          paddingBottom: '1.8mm',
        }}
      >
        <div style={{ marginBottom: '1.4mm' }}>
          <SkyLineOfficialLogo palette={palette} scale={0.94} />
        </div>

        <div
          className="w-full flex items-center justify-center"
          style={{
            minHeight: '13.2mm',
            maxHeight: '16.5mm',
            paddingLeft: '1mm',
            paddingRight: '1mm',
          }}
        >
          <div
            style={{
              fontFamily: template.fontFamilyHeading,
              fontWeight: nameStyle.fontWeight,
              fontSize: `${nameStyle.fontSizeMm}mm`,
              lineHeight: nameStyle.lineHeight,
              letterSpacing: nameStyle.letterSpacing,
              color: palette.nameColor,
              whiteSpace: nameStyle.allowWrap ? 'normal' : 'nowrap',
              wordBreak: 'keep-all',
              textRendering: 'geometricPrecision',
            }}
          >
            {displayFullName}
          </div>
        </div>

        <div
          className="inline-flex items-center justify-center"
          style={{
            marginTop: '1.1mm',
            height: '9.4mm',
            paddingLeft: '4.2mm',
            paddingRight: '5.2mm',
            borderRadius: '9999px',
            backgroundColor: config.ecoInkMode ? '#F8FAFC' : palette.badgeBg,
            border: config.ecoInkMode
              ? `0.3mm solid ${palette.primaryMain}`
              : 'none',
            gap: '2.2mm',
          }}
        >
          <StudentIdCardIcon color={palette.primaryMain} />

          <span
            style={{
              fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
              fontSize: '4.15mm',
              fontWeight: 600,
              color: isPurple ? '#4C1D95' : '#164E63',
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}
          >
            Mã HS:{' '}
            <strong
              style={{
                fontWeight: 800,
                fontSize: '4.45mm',
                color: palette.badgeText,
                letterSpacing: '0.02em',
              }}
            >
              {displayCode}
            </strong>
          </span>
        </div>

        <div
          className="flex items-center justify-center uppercase"
          style={{
            marginTop: '1.9mm',
            fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
            fontSize: '2.9mm',
            fontWeight: 700,
            letterSpacing: '0.11em',
            color: palette.subtitleColor,
            gap: '2.2mm',
          }}
        >
          <span>LỚP {cleanClass}</span>
          <span style={{ opacity: 0.75 }}>•</span>
          <span>{levelLabel}</span>
          <span style={{ opacity: 0.75 }}>•</span>
          <span>{displayCampusShort}</span>
        </div>

        <div
          className="inline-flex items-center justify-center"
          style={{
            marginTop: '1.3mm',
            paddingLeft: '3.2mm',
            paddingRight: '3.2mm',
            paddingTop: '0.6mm',
            paddingBottom: '0.6mm',
            borderRadius: '9999px',
            backgroundColor: isPurple
              ? 'rgba(237, 233, 254, 0.78)'
              : 'rgba(223, 243, 247, 0.78)',
            border: `0.25mm solid ${isPurple ? '#C4B5FD' : '#99E2F2'}`,
            fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
            fontSize: '2.45mm',
            fontWeight: 700,
            color: palette.primaryDark,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          <span>Chủ đề năm học: </span>
          <strong
            style={{
              marginLeft: '1mm',
              fontWeight: 800,
              color: palette.primaryMain,
              textTransform: 'uppercase',
            }}
          >
            {yearThemeText}
          </strong>
        </div>
      </div>

      <div
        className="absolute z-10 flex flex-col items-center justify-between"
        style={{
          position: 'absolute',
          zIndex: 10,
          right: '4.5mm',
          top: '14.5mm',
          width: '32.0mm',
          height: '47.5mm',
          paddingTop: '2.0mm',
          paddingBottom: '2.0mm',
          paddingLeft: '1.8mm',
          paddingRight: '1.8mm',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          borderRadius: '3.6mm',
          border: config.ecoInkMode
            ? `0.35mm solid ${palette.primaryMain}`
            : '0.35mm solid rgba(255, 255, 255, 0.96)',
          boxShadow: config.ecoInkMode
            ? 'none'
            : '0 2.2mm 5.5mm rgba(15, 23, 42, 0.18), 0 0 0 0.35mm rgba(148, 163, 184, 0.18)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: '28.2mm', height: '28.2mm' }}
        >
          {isPurple && (
            <>
              <span
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: '3.2mm',
                  height: '3.2mm',
                  borderTop: `0.55mm solid ${palette.primaryMain}`,
                  borderLeft: `0.55mm solid ${palette.primaryMain}`,
                  borderTopLeftRadius: '1.1mm',
                }}
              />
              <span
                className="absolute top-0 right-0 pointer-events-none"
                style={{
                  width: '3.2mm',
                  height: '3.2mm',
                  borderTop: `0.55mm solid ${palette.primaryMain}`,
                  borderRight: `0.55mm solid ${palette.primaryMain}`,
                  borderTopRightRadius: '1.1mm',
                }}
              />
              <span
                className="absolute bottom-0 left-0 pointer-events-none"
                style={{
                  width: '3.2mm',
                  height: '3.2mm',
                  borderBottom: `0.55mm solid ${palette.primaryMain}`,
                  borderLeft: `0.55mm solid ${palette.primaryMain}`,
                  borderBottomLeftRadius: '1.1mm',
                }}
              />
              <span
                className="absolute bottom-0 right-0 pointer-events-none"
                style={{
                  width: '3.2mm',
                  height: '3.2mm',
                  borderBottom: `0.55mm solid ${palette.primaryMain}`,
                  borderRight: `0.55mm solid ${palette.primaryMain}`,
                  borderBottomRightRadius: '1.1mm',
                }}
              />
            </>
          )}

          {student.qrStatus === 'DISABLED' ? (
            <div
              className="flex flex-col items-center justify-center text-center bg-slate-50 rounded-md border border-dashed border-slate-300"
              style={{ width: '25.5mm', height: '25.5mm', padding: '1.5mm' }}
            >
              <span
                style={{
                  fontSize: '2.1mm',
                  fontWeight: 700,
                  color: '#64748B',
                  lineHeight: 1.25,
                }}
              >
                Mã QR đang tạm khóa
              </span>
            </div>
          ) : (
            <div
              className="relative flex items-center justify-center"
              style={{ width: '26.6mm', height: '26.6mm' }}
            >
              {generatedQrUrl ? (
                <img
                  src={generatedQrUrl}
                  alt={`QR ${displayCode}`}
                  style={{
                    width: '26.6mm',
                    height: '26.6mm',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  className="w-full h-full bg-slate-100 rounded animate-pulse"
                  style={{ width: '26.6mm', height: '26.6mm' }}
                />
              )}

              <div
                className="absolute flex items-center justify-center bg-white rounded-sm"
                style={{
                  width: '5.8mm',
                  height: '5.8mm',
                  boxShadow: '0 0 0 0.4mm #FFFFFF',
                }}
              >
                <SkyLineBirdEmblem
                  color={isPurple ? '#482491' : '#0E869E'}
                  accentColor={isPurple ? '#6D35C7' : '#26B0C4'}
                  sizeMm={4.6}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="text-center w-full"
          style={{
            fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
            fontSize: '2.45mm',
            fontWeight: 700,
            color: isPurple ? '#35186B' : '#0E4F68',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            marginTop: '0.6mm',
          }}
        >
          {qrCaptionText}
        </div>
      </div>

      {inspectMode && (
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            border: '0.3mm dashed #EF4444',
          }}
        >
          <span
            className="absolute top-1 left-2 bg-red-600 text-white px-1.5 py-0.5 rounded font-mono"
            style={{ fontSize: '2.1mm' }}
          >
            MẶT TRƯỚC: 210 × 70 mm (21 × 7 cm)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * MẶT SAU BẢNG TÊN – LỜI CẢM ƠN QUÝ PHỤ HUYNH
 * Kích thước vật lý chuẩn: 210mm × 70mm (21 × 7 cm)
 */
export function NameplateBackFace({
  config,
  student,
  inspectMode = false,
}: {
  config: NameplatePrintConfig;
  student?: NameplateStudentItem;
  inspectMode?: boolean;
}) {
  const palette =
    NAMEPLATE_COLOR_THEMES[config.colorThemeId] || NAMEPLATE_COLOR_THEMES.SKYLINE_TEAL;
  const isMascot = isMascotTemplate(config.templateId);
  const isPurple =
    palette.id === 'GLOBAL_PURPLE' || palette.id === 'CENTRAL_INDIGO';

  const scriptColor = isMascot ? '#1E1B8B' : isPurple ? '#4A1E9E' : '#0F6E84';
  const backTitle =
    config.backTitle && config.backTitle.trim()
      ? config.backTitle.trim()
      : 'Cảm ơn Quý phụ huynh';
  const backSubtitle =
    config.backSubtitle && config.backSubtitle.trim()
      ? config.backSubtitle.trim()
      : 'đã đến tham dự buổi họp';
  const backMotto =
    config.backMotto && config.backMotto.trim()
      ? config.backMotto.trim()
      : 'Vững Nội lực – Hướng tương lai';

  const displayCode = student?.studentCode || student?.code || '0601012084';
  const verifyUrl =
    student?.verifyUrl ||
    `https://ssm.skylineschool.edu.vn/profile/verify/${encodeURIComponent(displayCode)}`;
  const cacheKey = `${verifyUrl}|${palette.qrDarkColor}`;
  const [backQrUrl, setBackQrUrl] = useState<string>(
    () => student?.qrDataUrl || qrDataUrlCache.get(cacheKey) || ''
  );

  useEffect(() => {
    if (!isMascot) return;
    if (student?.qrDataUrl) {
      setBackQrUrl(student.qrDataUrl);
      return;
    }
    const cached = qrDataUrlCache.get(cacheKey);
    if (cached) {
      setBackQrUrl(cached);
      return;
    }
    let mounted = true;
    QRCode.toDataURL(verifyUrl, {
      width: 960,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: {
        dark: palette.qrDarkColor || '#111827',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        qrDataUrlCache.set(cacheKey, dataUrl);
        if (mounted) setBackQrUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isMascot, verifyUrl, cacheKey, student?.qrDataUrl, palette.qrDarkColor]);

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '210mm',
        height: '70mm',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <BackSideArtwork
        templateId={config.templateId}
        palette={palette}
        ecoInkMode={config.ecoInkMode}
      />

      {/* NỘI DUNG TRUNG TÂM MẶT SAU */}
      <div
        className="absolute inset-y-0 flex flex-col items-center justify-start text-center z-10"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          zIndex: 10,
          left: isMascot ? '44mm' : '48mm',
          right: isMascot ? '49.5mm' : '42mm',
          paddingTop: isMascot ? '10.5mm' : '2.2mm',
        }}
      >
        {!isMascot && (
          <div style={{ marginBottom: '1.2mm' }}>
            <SkyLineOfficialLogo palette={palette} scale={0.92} />
          </div>
        )}

        <div
          style={{
            fontFamily: "'Dancing Script', 'Great Vibes', 'Pacifico', cursive",
            fontSize: isMascot ? '9.2mm' : '8.8mm',
            fontWeight: 700,
            color: scriptColor,
            lineHeight: 1.06,
            letterSpacing: '0.01em',
            marginTop: '0.3mm',
          }}
        >
          {backTitle}
        </div>

        <div
          style={{
            fontFamily: "'Dancing Script', 'Great Vibes', 'Pacifico', cursive",
            fontSize: isMascot ? '7.8mm' : '7.6mm',
            fontWeight: 700,
            color: scriptColor,
            lineHeight: 1.1,
            letterSpacing: '0.01em',
            marginTop: '-0.2mm',
          }}
        >
          {backSubtitle}
        </div>

        <div style={{ marginTop: '1.2mm' }}>
          <ThankYouHeartEmblem color={isMascot ? '#5842F4' : scriptColor} />
        </div>

        {/* CHỦ ĐỀ NĂM HỌC */}
        {isMascot ? (
          <div
            className="inline-flex items-center justify-center"
            style={{
              marginTop: '1.8mm',
              height: '6.8mm',
              paddingLeft: '3.4mm',
              paddingRight: '4.0mm',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '0.32mm solid #7DD3FC',
              gap: '1.5mm',
              whiteSpace: 'nowrap',
            }}
          >
            <MascotGreenLeafIcon />
            <span
              style={{
                fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
                fontSize: '2.5mm',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Chủ đề năm học:{' '}
              <strong
                style={{
                  fontWeight: 800,
                  fontSize: '2.6mm',
                  color: '#0098C6',
                  textTransform: 'uppercase',
                }}
              >
                {backMotto}
              </strong>
            </span>
          </div>
        ) : (
          <div
            className="inline-flex items-center justify-center"
            style={{
              marginTop: '1.5mm',
              paddingLeft: '4.0mm',
              paddingRight: '4.0mm',
              paddingTop: '0.85mm',
              paddingBottom: '0.85mm',
              borderRadius: '9999px',
              backgroundColor: config.ecoInkMode ? '#F8FAFC' : palette.badgeBg,
              border: `0.3mm solid ${isPurple ? '#C4B5FD' : '#99E2F2'}`,
              fontFamily: "'Montserrat', 'Be Vietnam Pro', sans-serif",
              fontSize: '2.65mm',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: palette.primaryDark,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            <span>CHỦ ĐỀ NĂM HỌC: </span>
            <span style={{ marginLeft: '1.2mm', color: palette.primaryMain }}>
              {backMotto}
            </span>
          </div>
        )}
      </div>

      {/* Trên Mẫu Linh vật (05 & 06), khung QR bên phải Mặt sau cũng hiển thị mã QR để Phụ huynh ngồi đối diện quét dễ dàng */}
      {isMascot && (
        <div
          className="absolute z-10 flex flex-col items-center justify-between"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '174.6mm',
            top: '34.5mm',
            width: '28.0mm',
            height: '23.8mm',
            paddingTop: '0.3mm',
            paddingBottom: '0.2mm',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: '19.6mm', height: '19.6mm' }}
          >
            <span
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderTop: '0.55mm solid #00A8E8',
                borderLeft: '0.55mm solid #00A8E8',
                borderTopLeftRadius: '0.9mm',
              }}
            />
            <span
              className="absolute top-0 right-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderTop: '0.55mm solid #00A8E8',
                borderRight: '0.55mm solid #00A8E8',
                borderTopRightRadius: '0.9mm',
              }}
            />
            <span
              className="absolute bottom-0 left-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderBottom: '0.55mm solid #00A8E8',
                borderLeft: '0.55mm solid #00A8E8',
                borderBottomLeftRadius: '0.9mm',
              }}
            />
            <span
              className="absolute bottom-0 right-0 pointer-events-none"
              style={{
                width: '2.6mm',
                height: '2.6mm',
                borderBottom: '0.55mm solid #00A8E8',
                borderRight: '0.55mm solid #00A8E8',
                borderBottomRightRadius: '0.9mm',
              }}
            />

            {backQrUrl && (
              <div
                className="relative flex items-center justify-center"
                style={{ width: '17.8mm', height: '17.8mm' }}
              >
                <img
                  src={backQrUrl}
                  alt="QR"
                  style={{
                    width: '17.8mm',
                    height: '17.8mm',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    display: 'block',
                  }}
                />
                <div
                  className="absolute flex items-center justify-center bg-white rounded-full"
                  style={{
                    width: '4.4mm',
                    height: '4.4mm',
                    boxShadow: '0 0 0 0.35mm #FFFFFF',
                  }}
                >
                  <SkyLineBirdEmblem
                    color="#0098C6"
                    accentColor="#38BDF8"
                    sizeMm={3.5}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className="text-center w-full"
            style={{
              fontFamily: "'Quicksand', 'Be Vietnam Pro', sans-serif",
              fontSize: '2.35mm',
              fontWeight: 800,
              color: '#1E1B8B',
              lineHeight: 1.05,
              whiteSpace: 'nowrap',
            }}
          >
            {config.qrCaption || 'Xem hồ sơ học sinh'}
          </div>
        </div>
      )}

      {inspectMode && (
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            border: '0.3mm dashed #2563EB',
          }}
        >
          <span
            className="absolute top-1 left-2 bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono"
            style={{ fontSize: '2.1mm' }}
          >
            MẶT SAU: 210 × 70 mm (21 × 7 cm)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 01 ĐƠN VỊ BẢNG TÊN TRẢI PHẲNG TRÊN TỜ A4 (210mm × 140mm)
 */
export function NameplateTentFlatUnit({
  student,
  config,
  campusShortLabel,
  inspectMode = false,
}: {
  student: NameplateStudentItem;
  config: NameplatePrintConfig;
  campusShortLabel?: string;
  inspectMode?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{
        width: '210mm',
        height: '140mm',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          width: '210mm',
          height: '70mm',
          transform: config.rotateBackSide180 ? 'rotate(180deg)' : 'none',
          transformOrigin: 'center center',
        }}
      >
        <NameplateBackFace
          config={config}
          student={student}
          inspectMode={inspectMode}
        />
      </div>

      {(config.showFoldLine || inspectMode) && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center justify-between"
          style={{
            top: '70mm',
            transform: 'translateY(-50%)',
          }}
        >
          <div
            className="w-full"
            style={{
              borderTop: inspectMode
                ? '0.35mm dashed #F59E0B'
                : '0.2mm dashed rgba(100, 116, 139, 0.42)',
            }}
          />
          {inspectMode && (
            <span
              className="absolute left-1/2 -translate-x-1/2 bg-amber-500 text-white px-2 py-0.5 rounded font-mono shadow-xs"
              style={{ fontSize: '2mm', whiteSpace: 'nowrap' }}
            >
              ▲ ĐƯỜNG GẤP ĐÔI CHỮ A (70 mm) ▼
            </span>
          )}
        </div>
      )}

      <div style={{ width: '210mm', height: '70mm' }}>
        <NameplateFrontFace
          student={student}
          config={config}
          campusShortLabel={campusShortLabel}
          inspectMode={inspectMode}
        />
      </div>
    </div>
  );
}

/**
 * TỜ GIẤY A4 CHUẨN IN ẤN (210mm × 297mm)
 */
export function NameplateA4Sheet({
  pair,
  topStudent,
  bottomStudent,
  config,
  campusShortLabel,
  pageIndex,
  totalPages,
  sheetIndex,
  totalSheets,
  inspectMode = false,
}: {
  pair?: [NameplateStudentItem, NameplateStudentItem?];
  topStudent?: NameplateStudentItem;
  bottomStudent?: NameplateStudentItem | null;
  config: NameplatePrintConfig;
  campusShortLabel?: string;
  pageIndex?: number;
  totalPages?: number;
  sheetIndex?: number;
  totalSheets?: number;
  inspectMode?: boolean;
}) {
  const firstStudent = pair ? pair[0] : topStudent;
  const secondStudent = pair ? pair[1] : bottomStudent;
  const idx = pageIndex ?? sheetIndex ?? 0;
  const total = totalPages ?? totalSheets ?? 1;

  if (!firstStudent) return null;

  return (
    <div
      className="nameplate-a4-sheet nameplate-a4-page relative bg-white mx-auto overflow-hidden"
      style={{
        width: '210mm',
        height: '297mm',
        boxSizing: 'border-box',
        paddingTop: '8.5mm',
        paddingBottom: '8.5mm',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {inspectMode && (
        <div
          className="absolute top-0 left-0 right-0 bg-emerald-500/15 border-b border-dashed border-emerald-600 flex items-center justify-center z-30 pointer-events-none"
          style={{ height: '8.5mm' }}
        >
          <span
            className="text-emerald-800 font-mono font-bold"
            style={{ fontSize: '2.2mm' }}
          >
            LỀ TRÊN A4: 8.5 mm (Tổng lề trên + dưới = 17 mm) — Trang {idx + 1}/
            {total}
          </span>
        </div>
      )}

      {(config.showCutLines || inspectMode) && (
        <div
          className="w-full relative z-20 pointer-events-none"
          style={{
            borderTop: inspectMode
              ? '0.35mm solid #EF4444'
              : '0.18mm solid rgba(148, 163, 184, 0.45)',
          }}
        >
          <span
            className="absolute left-1.5 -top-2 text-slate-400 select-none"
            style={{ fontSize: '2.3mm' }}
          >
            ✂
          </span>
        </div>
      )}

      <NameplateTentFlatUnit
        student={firstStudent}
        config={config}
        campusShortLabel={campusShortLabel}
        inspectMode={inspectMode}
      />

      {(config.showCutLines || inspectMode) && (
        <div
          className="w-full relative z-20 pointer-events-none flex items-center justify-between"
          style={{
            borderTop: inspectMode
              ? '0.4mm solid #EF4444'
              : '0.22mm dashed rgba(100, 116, 139, 0.55)',
          }}
        >
          <span
            className="absolute left-1.5 -top-2 text-slate-400 select-none"
            style={{ fontSize: '2.3mm' }}
          >
            ✂
          </span>
          {inspectMode && (
            <span
              className="absolute left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 py-0.5 rounded font-mono"
              style={{ fontSize: '2mm', whiteSpace: 'nowrap' }}
            >
              ✂ ĐƯỜNG CẮT TÁCH 02 BẢNG TÊN (148.5 mm) ✂
            </span>
          )}
          <span
            className="absolute right-1.5 -top-2 text-slate-400 select-none"
            style={{ fontSize: '2.3mm' }}
          >
            ✂
          </span>
        </div>
      )}

      {secondStudent ? (
        <NameplateTentFlatUnit
          student={secondStudent}
          config={config}
          campusShortLabel={campusShortLabel}
          inspectMode={inspectMode}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200 print:hidden"
          style={{ width: '210mm', height: '140mm' }}
        >
          <span style={{ fontSize: '3.2mm' }}>
            Vị trí bảng tên số 02 trên tờ A4 (Để trống vì số lượng học sinh lẻ)
          </span>
        </div>
      )}

      {(config.showCutLines || inspectMode) && (
        <div
          className="w-full relative z-20 pointer-events-none"
          style={{
            borderTop: inspectMode
              ? '0.35mm solid #EF4444'
              : '0.18mm solid rgba(148, 163, 184, 0.45)',
          }}
        >
          <span
            className="absolute left-1.5 -top-2 text-slate-400 select-none"
            style={{ fontSize: '2.3mm' }}
          >
            ✂
          </span>
        </div>
      )}

      {inspectMode && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-emerald-500/15 border-t border-dashed border-emerald-600 flex items-center justify-center z-30 pointer-events-none"
          style={{ height: '8.5mm' }}
        >
          <span
            className="text-emerald-800 font-mono font-bold"
            style={{ fontSize: '2.2mm' }}
          >
            LỀ DƯỚI A4: 8.5 mm (Kích thước chuẩn A4: 210 × 297 mm • Tỷ lệ 100%)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * BẢN TRÌNH BÀY MẪU TỔNG QUAN & MÔ PHỎNG 3D GẬP CHỮ A ĐẶT TRÊN BÀN HỌP
 */
export function Nameplate3DTentPreview({
  student,
  config,
  campusShortLabel,
}: {
  student: NameplateStudentItem;
  config: NameplatePrintConfig;
  campusShortLabel?: string;
}) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
      <div
        className="relative w-full overflow-hidden flex flex-col items-center justify-center py-7 px-6"
        style={{
          background:
            'linear-gradient(180deg, #4A3525 0%, #6E4F37 28%, #B58D67 52%, #DAB894 72%, #CDA67E 88%, #B98E67 100%)',
          minHeight: '285px',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,245,220,0.35) 0%, transparent 40%), radial-gradient(circle at 78% 15%, rgba(255,255,255,0.28) 0%, transparent 45%), linear-gradient(180deg, rgba(30,20,12,0.25) 0%, rgba(255,255,255,0.08) 52%, rgba(90,55,28,0.18) 100%)',
          }}
        />

        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '54%',
            height: '2px',
            background: 'rgba(255, 240, 220, 0.35)',
            boxShadow: '0 2px 12px rgba(60, 35, 15, 0.25)',
          }}
        />

        <div className="relative z-10 flex items-end justify-center pt-2 pb-1">
          <div
            className="absolute -bottom-3 left-6 right-4 h-7 rounded-full blur-md pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(35,18,6,0.58) 0%, rgba(35,18,6,0.42) 60%, rgba(35,18,6,0.28) 100%)',
              transform: 'rotate(-1.5deg)',
            }}
          />

          <div
            className="relative flex items-stretch"
            style={{
              transform:
                'perspective(1200px) rotateY(-8deg) rotateX(4deg) rotateZ(-1.2deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            <svg
              viewBox="0 0 92 224"
              style={{
                width: '78px',
                height: '198px',
                marginRight: '-2px',
                filter: 'drop-shadow(-4px 6px 8px rgba(0,0,0,0.28))',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <polygon points="90,2 6,192 90,218" fill="#CBD5E1" />
              <polygon points="6,192 90,218 90,210 14,186" fill="#94A3B8" />
              <line
                x1="90"
                y1="2"
                x2="6"
                y2="192"
                stroke="#F8FAFC"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1="90"
                y1="2"
                x2="90"
                y2="220"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>

            <div
              className="bg-white p-[3px] rounded-r-sm shadow-2xl overflow-hidden"
              style={{
                width: '594px',
                height: '198px',
                boxShadow:
                  '0 18px 32px -10px rgba(25, 12, 4, 0.55), 0 0 0 1px rgba(255,255,255,0.9)',
              }}
            >
              <div
                style={{
                  width: '210mm',
                  height: '70mm',
                  transform: 'scale(0.742)',
                  transformOrigin: 'top left',
                }}
              >
                <NameplateFrontFace
                  student={student}
                  config={config}
                  campusShortLabel={campusShortLabel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div>
            <div className="text-xs font-extrabold text-slate-800 mb-1.5 tracking-tight">
              MẶT TRƯỚC{' '}
              <span className="font-normal text-slate-500">
                (khi đặt trên bàn)
              </span>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="flex flex-col items-center justify-between py-0.5 text-[10px] font-semibold text-slate-600 select-none">
                <span>▲</span>
                <span
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  7 cm
                </span>
                <span>▼</span>
              </div>

              <div className="flex-1 overflow-hidden">
                <div
                  className="border border-slate-300 shadow-xs bg-white overflow-hidden"
                  style={{ width: '354px', height: '118px' }}
                >
                  <div
                    style={{
                      width: '210mm',
                      height: '70mm',
                      transform: 'scale(0.446)',
                      transformOrigin: 'top left',
                    }}
                  >
                    <NameplateFrontFace
                      student={student}
                      config={config}
                      campusShortLabel={campusShortLabel}
                    />
                  </div>
                </div>
                <div
                  className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mt-1 px-1"
                  style={{ width: '354px' }}
                >
                  <span>◄──────────────</span>
                  <span>21 cm</span>
                  <span>──────────────►</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-800 mb-1.5 tracking-tight">
              MẶT SAU{' '}
              <span className="font-normal text-slate-500">
                (khi đặt trên bàn)
              </span>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 overflow-hidden">
                <div
                  className="border border-slate-300 shadow-xs bg-white overflow-hidden"
                  style={{ width: '354px', height: '118px' }}
                >
                  <div
                    style={{
                      width: '210mm',
                      height: '70mm',
                      transform: 'scale(0.446)',
                      transformOrigin: 'top left',
                    }}
                  >
                    <NameplateBackFace config={config} student={student} />
                  </div>
                </div>
                <div
                  className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mt-1 px-1"
                  style={{ width: '354px' }}
                >
                  <span>◄──────────────</span>
                  <span>21 cm</span>
                  <span>──────────────►</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-extrabold text-slate-800 mb-1.5 tracking-tight">
            THIẾT KẾ PHẲNG{' '}
            <span className="font-normal text-slate-500">
              (trước khi gập đôi)
            </span>
          </div>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            <div className="flex flex-col items-center justify-between py-0.5 text-[10px] font-semibold text-slate-600 select-none">
              <span>▲</span>
              <span
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                7 cm
              </span>
              <span>▼</span>
            </div>

            <div>
              <div className="inline-flex border border-slate-300 shadow-xs bg-white overflow-hidden">
                <div
                  className="relative overflow-hidden border-r border-dashed border-slate-400"
                  style={{ width: '354px', height: '118px' }}
                >
                  <div
                    style={{
                      width: '210mm',
                      height: '70mm',
                      transform: 'scale(0.446)',
                      transformOrigin: 'top left',
                    }}
                  >
                    <NameplateFrontFace
                      student={student}
                      config={config}
                      campusShortLabel={campusShortLabel}
                    />
                  </div>
                </div>

                <div
                  className="relative overflow-hidden"
                  style={{ width: '354px', height: '118px' }}
                >
                  <div
                    style={{
                      width: '210mm',
                      height: '70mm',
                      transform: 'scale(0.446)',
                      transformOrigin: 'top left',
                    }}
                  >
                    <NameplateBackFace config={config} student={student} />
                  </div>
                </div>
              </div>

              <div
                className="grid grid-cols-2 text-[11px] font-semibold text-slate-700 mt-1"
                style={{ width: '708px' }}
              >
                <div className="flex items-center justify-between px-1">
                  <span>◄──────────────</span>
                  <span>21 cm</span>
                  <span>──────────────►</span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span>◄──────────────</span>
                  <span>21 cm</span>
                  <span>──────────────►</span>
                </div>
              </div>
              <div
                className="flex items-center justify-between text-[11px] font-bold text-slate-800 mt-0.5 px-1"
                style={{ width: '708px' }}
              >
                <span>◄──────────────────────────────</span>
                <span>42 cm (kích thước phẳng ngang) • Khi gập đôi dọc chuẩn A4: 21 × 14 cm</span>
                <span>──────────────────────────────►</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
