import { Suspense } from "react";
import XepLoaiClient from "./client";

export const metadata = {
  title: "Tra cứu Xếp loại học tập | Sky-Line SQMS",
  description: "Tra cứu xếp loại học lực & rèn luyện theo TT22, TT27 (HK1, HK2, Cả năm)",
};

export default function XepLoaiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải...</div>}>
      <XepLoaiClient />
    </Suspense>
  );
}
