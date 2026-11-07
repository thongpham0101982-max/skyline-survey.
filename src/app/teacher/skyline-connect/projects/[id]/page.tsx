"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  useEffect(() => {
    if (id) {
      router.replace(`/teacher/skyline-connect/groups-projects?projectId=${encodeURIComponent(id)}`);
    }
  }, [id, router]);

  return (
    <div className="p-8 text-center text-xs text-slate-500">
      Đang mở không gian Dự án hợp tác...
    </div>
  );
}
