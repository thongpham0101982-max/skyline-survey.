"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, ArrowLeft, FileText, Bot, Users } from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";

export default function TeacherPublicProfilePage() {
  const params = useParams();
  const userId = String(params?.userId || "");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/skyline-connect?action=mySpace&userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, [userId]);

  const profile = data?.profile;
  const badges = data?.badges || [];
  const posts = data?.publishedPosts || [];
  const products = data?.products || [];
  const projects = data?.projects || [];

  return (
    <div className="min-h-screen bg-[#F5F8FA] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      <SkylineConnectSubNav />

      <Link
        href="/teacher/skyline-connect"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123E4A] hover:text-[#159EAA]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Bức tường ý tưởng AI</span>
      </Link>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs">
          Đang tải hồ sơ sáng tạo của giáo viên...
        </div>
      ) : (
        <>
          <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#123E4A] p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#123E4A] text-white text-xl font-extrabold flex items-center justify-center">
                {(profile?.fullName || "G").charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#123E4A]">{profile?.fullName}</h1>
                <p className="text-xs font-semibold text-[#159EAA]">
                  {profile?.mainSubject} • {profile?.campusName}
                </p>
                <p className="text-xs text-slate-600 mt-1">{profile?.bio}</p>
              </div>
            </div>

            {badges.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#D6A74A]" />
                  <span>Huy hiệu vinh danh Bảng vàng sáng tạo</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b: any) => (
                    <div
                      key={b.id}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs"
                    >
                      <span className="font-extrabold text-[#D6A74A]">★ Hạng {b.rank}:</span>{" "}
                      <span className="font-bold text-[#123E4A]">{b.badgeTitle}</span>{" "}
                      <span className="text-slate-500">({b.periodName})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#159EAA]" />
                <span>Bài đã chia sẻ ({posts.length})</span>
              </div>
              {posts.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/teacher/skyline-connect/posts/${p.id}`}
                  className="block p-2 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 font-semibold text-slate-800 truncate"
                >
                  {p.title || "Chia sẻ chuyên môn"}
                </Link>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#159EAA]" />
                <span>Sản phẩm AI ({products.length})</span>
              </div>
              {products.map((prod: any) => (
                <div key={prod.id} className="p-2 rounded-lg bg-[#F8FAFC] font-semibold">
                  {prod.name} (v{prod.currentVersion})
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#159EAA]" />
                <span>Dự án hợp tác ({projects.length})</span>
              </div>
              {projects.map((proj: any) => (
                <div key={proj.id} className="p-2 rounded-lg bg-[#F8FAFC] font-semibold">
                  {proj.title}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
