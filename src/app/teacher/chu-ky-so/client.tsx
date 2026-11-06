"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PenTool, FileCheck, ShieldCheck } from "lucide-react";
import { TeacherSignatureProfileClient } from "@/app/teacher/profile/chu-ky-so/client";
import { TeacherHoSoChoKyClient } from "@/app/teacher/ho-so-cho-ky/client";

function TeacherChuKySoHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "pending" || searchParams.get("tab") === "ho-so-cho-ky" 
    ? "pending" 
    : "signature";

  const [activeTab, setActiveTab] = useState<"signature" | "pending">(initialTab);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pending" || tabParam === "ho-so-cho-ky") {
      setActiveTab("pending");
    } else if (tabParam === "signature" || tabParam === "profile") {
      setActiveTab("signature");
    }
  }, [searchParams]);

  // Fetch true pending signatures count
  useEffect(() => {
    let isMounted = true;
    fetch("/api/teacher/digital-signature/documents")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.stats?.pending !== undefined) {
          setPendingCount(Number(data.stats.pending));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSwitchTab = (tab: "signature" | "pending") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/teacher/chu-ky-so?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Academic Ledger Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs border-l-4 border-l-[#003B3A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#003B3A] text-white">
                Chữ ký số & Hồ sơ chờ ký
              </span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00A19A]" />
                Chuẩn CA & Xác thực số Sky-Line
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Trung tâm Chữ ký số & Phê duyệt Hồ sơ
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Quản lý thiết lập chữ ký cá nhân và thực hiện ký số điện tử trên các hồ sơ học tập, sổ điểm và phiếu đánh giá.
            </p>
          </div>

          {/* Unified Ledger Segmented Control */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleSwitchTab("signature")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "signature"
                  ? "bg-[#003B3A] text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <PenTool className="w-4 h-4 text-[#00A19A]" />
              <span>Chữ ký số của tôi</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab("pending")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-[#003B3A] text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#00A19A]" />
              <span>Hồ sơ chờ ký</span>
              {pendingCount !== null && pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white tabular-nums shadow-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="tab-content transition-all duration-200">
        {activeTab === "signature" ? (
          <div className="animate-in fade-in duration-200">
            <TeacherSignatureProfileClient />
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <TeacherHoSoChoKyClient />
          </div>
        )}
      </div>
    </div>
  );
}

export function TeacherChuKySoHubClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Đang tải trung tâm chữ ký số...</div>}>
      <TeacherChuKySoHubContent />
    </Suspense>
  );
}
