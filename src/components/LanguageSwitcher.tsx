"use client";

import React, { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { SupportedLanguage } from "@/config/sidebarTranslations";

// ─── SVG FLAG COMPONENTS (Crisp, High-Resolution, Universal for all OS/Windows) ───

export function VietnamFlag({ className = "w-[18px] h-[12px]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 900 600" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      aria-label="Cờ Việt Nam"
      style={{ display: "block" }}
    >
      <rect width="900" height="600" fill="#DA251D" />
      <polygon 
        points="450,150 487,264 607,264 510,334 547,448 450,378 353,448 390,334 293,264 413,264" 
        fill="#FFFF00" 
      />
    </svg>
  );
}

export function UKFlag({ className = "w-[18px] h-[12px]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 60 30" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      aria-label="Cờ Nước Anh (UK)"
      style={{ display: "block" }}
    >
      {/* Blue background */}
      <rect width="60" height="30" fill="#012169" />
      {/* White saltire diagonals */}
      <path d="M0 0 L60 30 M60 0 L0 30" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="square" />
      {/* Red saltire diagonals */}
      <path d="M0 0 L30 15 M60 0 L30 15 M0 30 L30 15 M60 30 L30 15" stroke="#C8102E" strokeWidth="2" strokeLinecap="square" />
      {/* White cross backing */}
      <path d="M30 0 v30 M0 15 h60" stroke="#FFFFFF" strokeWidth="10" />
      {/* Red cross */}
      <path d="M30 0 v30 M0 15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "dropdown" | "compact";
  theme?: "light" | "dark";
}

export function LanguageSwitcher({ 
  className = "", 
  variant = "pill",
  theme = "light" 
}: LanguageSwitcherProps) {
  const [lang, setLang] = useState<SupportedLanguage>("vi");
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = (localStorage.getItem("ssm_lang") || localStorage.getItem("ssm_gvnn_lang")) as SupportedLanguage;
      if (saved === "vi" || saved === "en") {
        setLang(saved);
      }
    }

    const handleLangEvent = (e: any) => {
      const newL = e.detail;
      if (newL === "vi" || newL === "en") {
        setLang(newL);
      }
    };

    window.addEventListener("ssm_language_change", handleLangEvent);
    return () => window.removeEventListener("ssm_language_change", handleLangEvent);
  }, []);

  const changeLanguage = (newLang: SupportedLanguage) => {
    if (newLang === lang) return;
    setLang(newLang);
    setIsOpen(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ssm_lang", newLang);
        localStorage.setItem("ssm_gvnn_lang", newLang);
        // Also set cookie if server-side components need it
        document.cookie = `ssm_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
      window.dispatchEvent(new CustomEvent("ssm_language_change", { detail: newLang }));
    }
  };

  if (!mounted) {
    return (
      <div className={`h-8 w-24 ${theme === "dark" ? "bg-white/10" : "bg-slate-100"} rounded-xl animate-pulse ${className}`} />
    );
  }

  // Variant: Pill Switcher (Default, sleek and prominent right on the top navbar)
  if (variant === "pill") {
    const isDark = theme === "dark";
    return (
      <div 
        className={`inline-flex items-center p-0.5 rounded-xl ${
          isDark 
            ? "bg-white/10 border border-white/20 shadow-inner" 
            : "bg-slate-100/95 border border-slate-200/90 shadow-2xs"
        } ${className}`}
        role="group"
        aria-label="Language Switcher"
      >
        {/* Nút Tiếng Việt với Biểu tượng Lá cờ Việt Nam */}
        <button
          type="button"
          onClick={() => changeLanguage("vi")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            lang === "vi"
              ? isDark 
                ? "bg-white text-[#003B3A] shadow-xs" 
                : "bg-[#003B3A] text-white shadow-xs"
              : isDark
                ? "text-teal-100/80 hover:text-white hover:bg-white/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          title="Giao diện Tiếng Việt"
        >
          <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-2xs">
            <VietnamFlag className="w-[18px] h-[12px]" />
          </span>
          <span className="text-[11px] font-black tracking-wide">VI</span>
        </button>

        {/* Nút Tiếng Anh với Biểu tượng Lá cờ Nước Anh */}
        <button
          type="button"
          onClick={() => changeLanguage("en")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            lang === "en"
              ? isDark 
                ? "bg-white text-[#003B3A] shadow-xs" 
                : "bg-[#003B3A] text-white shadow-xs"
              : isDark
                ? "text-teal-100/80 hover:text-white hover:bg-white/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          title="English Interface"
        >
          <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-2xs">
            <UKFlag className="w-[18px] h-[12px]" />
          </span>
          <span className="text-[11px] font-black tracking-wide">EN</span>
        </button>
      </div>
    );
  }

  // Variant: Dropdown mode if used in tight spots
  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
        title={lang === "en" ? "Change Language" : "Đổi ngôn ngữ"}
      >
        <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-2xs">
          {lang === "vi" ? <VietnamFlag className="w-[18px] h-[12px]" /> : <UKFlag className="w-[18px] h-[12px]" />}
        </span>
        <span>{lang === "vi" ? "Tiếng Việt" : "English"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white border border-slate-200 shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => changeLanguage("vi")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                lang === "vi" ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-2xs">
                  <VietnamFlag className="w-[18px] h-[12px]" />
                </span>
                <span>Tiếng Việt</span>
              </span>
              {lang === "vi" && <Check className="w-3.5 h-3.5 text-teal-600" />}
            </button>

            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                lang === "en" ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-2xs">
                  <UKFlag className="w-[18px] h-[12px]" />
                </span>
                <span>English</span>
              </span>
              {lang === "en" && <Check className="w-3.5 h-3.5 text-teal-600" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
