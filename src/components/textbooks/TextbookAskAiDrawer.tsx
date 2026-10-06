"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Bot,
  User,
  RotateCcw,
  Compass
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
  citation?: {
    bookTitle: string;
    chapter: string;
    lesson: string;
    pageStart: number;
    pageEnd: number;
  };
}

interface TextbookAskAiDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbook: any;
  onOpenPage?: (pageNumber: number) => void;
}

export function TextbookAskAiDrawer({
  open,
  onOpenChange,
  textbook,
  onOpenPage
}: TextbookAskAiDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "Bài học đầu tiên có những kiến thức trọng tâm gì?",
    "Nội dung phương trình hoặc hằng đẳng thức nằm ở bài nào?",
    "Gợi ý hoạt động khởi động bài học thú vị dựa trên sách này.",
    "Tóm tắt các định lý và công thức chính trong Chương I."
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || !textbook?.id || loading) return;

    const userMsg: Message = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/learning-resources/textbooks/${textbook.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });

      const data = await res.json();
      if (data.success && data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            citation: data.citation
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Rất tiếc, Trợ lý chưa tìm thấy câu trả lời trong cuốn sách này."
          }
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Đã xảy ra lỗi khi kết nối với Trợ lý AI: " + e.message
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !textbook) return null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 text-sm md:text-base">
              Hỏi đáp AI theo Sách giáo khoa
            </span>
            <p className="text-xs text-slate-500 font-normal">
              Tra cứu chuẩn xác từ: {textbook.title}
            </p>
          </div>
        </div>
      }
      subtitle={
        <span className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
          Mô hình chuẩn xác • Bắt buộc trích dẫn nguồn
        </span>
      }
    >
      <div className="flex flex-col h-[75vh]">
        {/* Messages history */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 ? (
            <div className="py-8 space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 text-slate-700 text-xs leading-relaxed space-y-2">
                <p className="font-semibold text-[#003B3A] flex items-center gap-1.5 text-sm">
                  <Bot className="w-4 h-4 text-[#00A19A]" /> Xin chào Thầy/Cô!
                </p>
                <p>
                  Em là Trợ lý Học thuật SGK số. Em chỉ trả lời dựa trên nội dung thực tế của cuốn sách{" "}
                  <strong>{textbook.title}</strong> và luôn cung cấp chính xác Chương, Bài và số Trang để Thầy/Cô đối chiếu.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#00A19A]" /> Gợi ý câu hỏi nhanh:
                </p>
                <div className="space-y-1.5">
                  {suggestedQuestions.map((sq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(sq)}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#00A19A] hover:bg-teal-50/40 text-xs text-slate-700 transition-all font-medium"
                    >
                      💡 {sq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#003B3A] text-white rounded-br-xs"
                      : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Mandatory Citation card if assistant response */}
                  {msg.citation && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-[11px] space-y-1 text-slate-600 bg-white/60 p-2 rounded-lg">
                      <p className="font-semibold text-teal-800 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" /> Trích dẫn học thuật:
                      </p>
                      <p>• {msg.citation.chapter}</p>
                      <p>• {msg.citation.lesson}</p>
                      <p className="font-medium text-teal-700">
                        • Trang {msg.citation.pageStart} - {msg.citation.pageEnd}
                      </p>
                      {onOpenPage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenPage(msg.citation!.pageStart)}
                          className="mt-1 h-6 text-[10px] bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100 w-full"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Mở trang {msg.citation.pageStart} trong sách
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500 italic py-2">
              <Bot className="w-4 h-4 text-teal-600 animate-spin" />
              Đang tra cứu mục lục và kiến thức trong sách...
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="pt-3 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi tra cứu kiến thức trong sách..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A] focus:bg-white"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl h-9 px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </DetailDrawer>
  );
}
