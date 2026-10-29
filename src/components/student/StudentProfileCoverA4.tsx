'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface StudentProfileCoverProps {
  student: {
    studentName: string;
    studentCode: string;
    vneduCode?: string | null;
    className?: string | null;
    campusName?: string | null;
    yearName?: string | null;
    yearTheme?: string | null;
    qrDataUrl?: string | null;
  };
  /** Chế độ xem trước hay chế độ in */
  mode?: 'preview' | 'print';
  /** Tùy chọn ẩn hoặc hiển thị thông tin lớp/cơ sở ở chân bìa nếu muốn */
  showExtraMeta?: boolean;
}

export default function StudentProfileCoverA4({
  student,
  mode = 'print',
  showExtraMeta = false,
}: StudentProfileCoverProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(student.qrDataUrl || '');

  useEffect(() => {
    if (!student.qrDataUrl && student.studentCode) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ssm.skylineschool.edu.vn';
      const verifyUrl = `${baseUrl}/profile/verify/${encodeURIComponent(student.studentCode.trim())}`;
      
      QRCode.toDataURL(verifyUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#003B3A', // Mã màu Deep Pine sắc nét
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Error generating cover QR code:', err));
    }
  }, [student.studentCode, student.qrDataUrl]);

  return (
    <div
      className={`student-cover-a4 relative bg-white text-slate-800 select-none overflow-hidden ${
        mode === 'print'
          ? 'print:break-after-page print:page-break-after-always shadow-md print:shadow-none'
          : 'shadow-2xl rounded-2xl'
      }`}
      style={{
        width: mode === 'print' ? '210mm' : '100%',
        maxWidth: '210mm',
        height: mode === 'print' ? '297mm' : 'auto',
        aspectRatio: '210 / 297',
        margin: '0 auto',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* Background artwork bám sát 100% mẫu thiết kế Sky-Line cung cấp */}
      <img
        src="/images/covers/student-profile-cover-template.jpg"
        alt="Sky-Line Student Profile Cover"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        style={{
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />

      {/* ========================================================================= */}
      {/* KHUNG THÔNG TIN HỌC SINH TỰ ĐỘNG GÁN (FULL NAME & STUDENT ID)             */}
      {/* Vị trí được cân chỉnh khớp chính xác với khung bo tròn trên ảnh mẫu gốc   */}
      {/* ========================================================================= */}
      
      {/* DÒNG 1: FULL NAME */}
      <div
        className="absolute flex items-center"
        style={{
          top: '44.8%',
          left: '42.5%',
          width: '41.5%',
          height: '4.2%',
          zIndex: 10,
        }}
      >
        {/* Nền che nhẹ dấu chấm mờ trên ảnh gốc */}
        <div className="absolute inset-0 bg-[#F4FBFB]/90 backdrop-blur-[1px] rounded-md" />
        <span
          className="relative z-10 font-black text-slate-900 uppercase truncate px-2 text-sm sm:text-base md:text-lg tracking-wide drop-shadow-2xs"
          style={{
            fontFamily: 'var(--font-be-vietnam-pro), sans-serif, system-ui',
            color: '#002B2A',
          }}
          title={student.studentName}
        >
          {student.studentName || 'Học sinh Sky-Line'}
        </span>
      </div>

      {/* DÒNG 2: STUDENT ID */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          top: '51.3%',
          left: '42.5%',
          width: '41.5%',
          height: '4.2%',
          zIndex: 10,
        }}
      >
        {/* Nền che nhẹ dấu chấm mờ trên ảnh gốc */}
        <div className="absolute inset-0 bg-[#F4FBFB]/90 backdrop-blur-[1px] rounded-md" />
        <span
          className="relative z-10 font-mono font-extrabold text-[#003B3A] text-sm sm:text-base md:text-lg tracking-wider px-2"
          style={{ letterSpacing: '0.08em' }}
        >
          {student.studentCode || '---'}
        </span>

        {/* Mã phụ VnEdu (nếu có) */}
        {student.vneduCode && (
          <span className="relative z-10 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
            vnEdu: {student.vneduCode}
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MÃ QR CODE CHÍNH HÃNG SKY-LINE GÓC DƯỚI BÊN PHẢI (TRƯỜNG TỒN SUỐT VÒNG ĐỜI) */}
      {/* ========================================================================= */}
      <div
        className="absolute flex items-center justify-center p-1 bg-white rounded-xl shadow-xs"
        style={{
          bottom: '3.7%',
          right: '4.9%',
          width: '12.8%',
          aspectRatio: '1 / 1',
          zIndex: 10,
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
        }}
      >
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code ${student.studentCode}`}
            className="w-full h-full object-contain rounded-md"
            style={{
              imageRendering: 'crisp-edges',
            }}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 animate-pulse rounded-md flex items-center justify-center text-[8px] text-slate-400">
            QR...
          </div>
        )}
      </div>

      {/* CHỦ ĐỀ NĂM HỌC HIỂN THỊ TRÊN BÌA HỒ SƠ */}
      {student.yearTheme && (
        <div
          className="absolute flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-teal-300/40"
          style={{
            bottom: showExtraMeta ? '3.8%' : '2.5%',
            left: '6%',
            maxWidth: '74%',
            zIndex: 10,
            background: 'linear-gradient(135deg, rgba(0, 43, 42, 0.88) 0%, rgba(0, 80, 76, 0.82) 100%)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.32)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-amber-300 via-[#00A19A] to-teal-300 shrink-0" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[8px] font-black uppercase tracking-widest text-teal-200 whitespace-nowrap">
              ✦ CHỦ ĐỀ THEO NĂM HỌC {student.yearName ? `(${student.yearName})` : ''}
            </span>
            <span
              className="text-[13px] sm:text-[14px] font-bold text-amber-100 italic tracking-wide truncate max-w-[440px] leading-snug"
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', 'Palatino Linotype', 'Book Antiqua', Georgia, 'Times New Roman', serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.45)',
              }}
              title={student.yearTheme}
            >
              &ldquo;{student.yearTheme}&rdquo;
            </span>
          </div>
        </div>
      )}

      {/* Thông tin mở rộng (tùy chọn lớp/cơ sở/năm học nếu muốn xuất hiện phụ trợ) */}
      {showExtraMeta && (student.className || student.campusName || student.yearName) && (
        <div
          className="absolute text-[9.5px] text-teal-100 font-medium flex items-center gap-2 pointer-events-none"
          style={{
            bottom: '1.2%',
            left: '6%',
            zIndex: 10,
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}
        >
          {student.className && <span>Lớp: <strong className="font-bold text-white">{student.className}</strong></span>}
          {student.className && (student.campusName || student.yearName) && <span>•</span>}
          {student.campusName && <span>Cơ sở: <strong className="font-bold text-white">{student.campusName}</strong></span>}
          {student.campusName && student.yearName && <span>•</span>}
          {student.yearName && <span>Năm học: <strong className="font-bold text-white">{student.yearName}</strong></span>}
        </div>
      )}
    </div>
  );
}
