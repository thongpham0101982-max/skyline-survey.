"use client";

import React, { useState } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BookOpen,
  Sparkles,
  List,
  Search,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfReaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbook: {
    id: string;
    title: string;
    fileUrl: string;
    totalPages?: number;
    subject?: { subjectName: string };
    grade?: string;
  } | null;
  initialPage?: number;
  onOpenStructure?: () => void;
  onOpenAskAi?: () => void;
}

export function PdfReaderModal({
  open,
  onOpenChange,
  textbook,
  initialPage = 1,
  onOpenStructure,
  onOpenAskAi
}: PdfReaderModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync initialPage when it changes
  React.useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, textbook?.id]);

  if (!open || !textbook) return null;

  const totalPages = textbook.totalPages || 120;
  const pdfUrl = `${textbook.fileUrl}#page=${currentPage}&zoom=${zoom}`;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => {
    if (zoom < 200) setZoom(zoom + 25);
  };

  const handleZoomOut = () => {
    if (zoom > 50) setZoom(zoom - 25);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`flex flex-col bg-slate-900 border border-slate-700/60 shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 rounded-none w-screen h-screen"
            : "w-[96vw] max-w-6xl h-[92vh] rounded-2xl overflow-hidden"
        }`}
      >
        {/* Top Control Header - Sky-Line Deep Pine theme */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#003B3A] text-white border-b border-teal-800/40 select-none">
          {/* Title & Metadata */}
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-[#00A19A]/20 border border-[#00A19A]/40 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-teal-300" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-white truncate">{textbook.title}</h3>
              <p className="text-[11px] text-teal-200/80">
                {textbook.subject?.subjectName ? `Môn: ${textbook.subject.subjectName} • ` : ""}
                {textbook.grade ? `Khối ${textbook.grade} • ` : ""}
                Đang đọc trực tiếp trên SSM
              </p>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Page navigation */}
            <div className="flex items-center bg-slate-800/70 border border-teal-500/30 rounded-lg px-2 py-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 mx-2 text-xs font-medium">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  className="w-12 text-center bg-slate-900 border border-teal-500/40 rounded px-1 py-0.5 text-teal-300 focus:outline-none focus:border-teal-400 text-xs font-semibold"
                />
                <span className="text-slate-400">/ {totalPages}</span>
              </div>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center bg-slate-800/70 border border-teal-500/30 rounded-lg px-1 py-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-medium text-slate-300 px-1.5">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mở trong tab mới */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfUrl, "_blank")}
              className="h-8 text-xs bg-slate-800/60 border-teal-500/40 text-teal-200 hover:bg-teal-500/20 hover:text-white"
              title="Mở sách giáo khoa trong tab trình duyệt mới"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Mở tab mới
            </Button>

            {/* Mục lục button */}
            {onOpenStructure && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenStructure}
                className="h-8 text-xs bg-slate-800/60 border-teal-500/40 text-teal-200 hover:bg-teal-500/20 hover:text-white"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                Mục lục
              </Button>
            )}

            {/* Hỏi AI button */}
            {onOpenAskAi && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAskAi}
                className="h-8 text-xs bg-gradient-to-r from-teal-600/30 to-emerald-600/30 border-teal-400/50 text-teal-200 hover:text-white hover:border-teal-400"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
                Hỏi AI
              </Button>
            )}

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer Frame using object with iframe fallback */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col">
          <object
            key={pdfUrl}
            data={pdfUrl}
            type="application/pdf"
            className="w-full flex-1 border-0"
          >
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={textbook.title}
            >
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-300">
                <BookOpen className="w-12 h-12 text-teal-400 mb-4 opacity-80" />
                <p className="text-base font-semibold mb-2">Trình duyệt không hỗ trợ xem trước PDF trong khung</p>
                <p className="text-sm text-slate-400 mb-6 max-w-md">
                  Thầy/Cô vui lòng bấm nút bên dưới để mở file PDF sách giáo khoa trong tab mới hoặc tải về máy.
                </p>
                <Button
                  onClick={() => window.open(textbook.fileUrl, "_blank")}
                  className="bg-[#00A19A] hover:bg-[#008f89] text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Mở sách trong tab mới
                </Button>
              </div>
            </iframe>
          </object>

          {/* Quick status bar */}
          <div className="px-4 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Đang đọc: {textbook.title} — Trang {currentPage}</span>
            <span className="flex items-center gap-2">
              <span>Nếu khung xem bị chặn, bấm</span>
              <button
                type="button"
                onClick={() => window.open(pdfUrl, "_blank")}
                className="text-teal-400 hover:text-teal-300 underline font-medium inline-flex items-center gap-1"
              >
                Mở trong tab riêng <ExternalLink className="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
