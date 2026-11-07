"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProductRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  useEffect(() => {
    if (id) {
      router.replace(`/teacher/skyline-connect/explore?search=${encodeURIComponent(id)}`);
    }
  }, [id, router]);

  return (
    <div className="p-8 text-center text-xs text-slate-500">
      Đang mở hồ sơ Sản phẩm AI...
    </div>
  );
}
