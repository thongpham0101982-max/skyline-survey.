"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Edit2,
  Save,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  Layers
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

interface TextbookStructureDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbook: any;
  onSelectLessonPage?: (pageNumber: number) => void;
  onStructureUpdated?: () => void;
  isAdmin?: boolean;
}

export function TextbookStructureDrawer({
  open,
  onOpenChange,
  textbook,
  onSelectLessonPage,
  onStructureUpdated,
  isAdmin = false
}: TextbookStructureDrawerProps) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && textbook?.id) {
      fetchStructure();
    }
  }, [open, textbook?.id]);

  const fetchStructure = async () => {
    if (!textbook?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/learning-resources/textbooks/${textbook.id}/structure`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setChapters(data.data);
        // Expand all chapters initially
        const exp: Record<string, boolean> = {};
        data.data.forEach((c: any) => {
          exp[c.id || c.chapterNumber] = true;
        });
        setExpandedChapters(exp);
      }
    } catch (e) {
      console.error("Failed to fetch structure:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (key: string) => {
    setExpandedChapters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveStructure = async (markReady = false) => {
    if (!textbook?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/learning-resources/textbooks/${textbook.id}/structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters, markReady })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Lưu cấu trúc thành công!");
        setIsEditing(false);
        if (onStructureUpdated) onStructureUpdated();
        fetchStructure();
      } else {
        toast.error(data.error || "Không thể lưu cấu trúc.");
      }
    } catch (e: any) {
      toast.error("Lỗi khi lưu cấu trúc: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !textbook) return null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#00A19A]" />
          <div>
            <span className="font-semibold text-slate-800 text-sm md:text-base">
              Mục lục Sách giáo khoa
            </span>
            <p className="text-xs text-slate-500 font-normal">
              {textbook.title} ({chapters.length} Chương)
            </p>
          </div>
        </div>
      }
      subtitle={
        textbook.processingStatus === "REVIEW_REQUIRED" && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            Cần kiểm tra & Phê duyệt cấu trúc AI
          </Badge>
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {textbook.processingStatus === "READY" ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sách đã được xuất bản
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Bản nháp cấu trúc</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {isEditing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Hủy
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-slate-300"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Chỉnh sửa
                  </Button>
                )}

                {isEditing && (
                  <Button
                    size="sm"
                    onClick={() => handleSaveStructure(false)}
                    disabled={saving}
                    className="bg-[#00A19A] hover:bg-[#008B85] text-white"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Lưu nháp
                  </Button>
                )}

                {textbook.processingStatus !== "READY" && (
                  <Button
                    size="sm"
                    onClick={() => handleSaveStructure(true)}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Phê duyệt cấu trúc
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Đang tải cây cấu trúc Chương - Bài...
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Chưa có cấu trúc Chương - Bài. Hệ thống đang bóc tách tự động hoặc Thầy/Cô có thể tạo mới.
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch, chIdx) => {
              const chKey = ch.id || ch.chapterNumber || String(chIdx);
              const isExpanded = expandedChapters[chKey] ?? true;

              return (
                <div
                  key={chKey}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white transition-all"
                >
                  {/* Chapter Header */}
                  <div
                    onClick={() => toggleChapter(chKey)}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-teal-50/50 cursor-pointer select-none transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <button type="button" className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#00A19A]" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs font-bold text-[#003B3A] uppercase tracking-wide mr-2">
                          {ch.chapterNumber}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{ch.title}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] text-slate-500 font-normal">
                      {ch.lessons?.length || 0} bài
                    </Badge>
                  </div>

                  {/* Lessons list */}
                  {isExpanded && ch.lessons && ch.lessons.length > 0 && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {ch.lessons.map((les: any, lesIdx: number) => (
                        <div
                          key={les.id || lesIdx}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/80 transition-colors group"
                        >
                          <div className="flex items-start gap-3 min-w-0 pr-2">
                            <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-700 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-teal-100">
                              {lesIdx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700">
                                  {les.lessonNumber}:
                                </span>
                                <span className="text-xs font-medium text-slate-900 truncate">
                                  {les.title}
                                </span>
                              </div>
                              {les.summary && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-md">
                                  {les.summary}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                              Trang {les.pageStart} - {les.pageEnd}
                            </span>
                            {onSelectLessonPage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onSelectLessonPage(les.pageStart)}
                                className="h-7 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-100/60 font-medium px-2"
                              >
                                Xem bài
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}
