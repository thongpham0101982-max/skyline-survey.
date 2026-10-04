import { Suspense } from "react";
import ThanhTichClient from "./client";

export const metadata = {
  title: "Tra cứu Thành tích Học sinh | Sky-Line SQMS",
  description: "Bảng vàng thành tích học sinh: Olympic, KHKT, STEM, Thể thao, Nghệ thuật các cấp",
};

export default function ThanhTichPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải...</div>}>
      <ThanhTichClient />
    </Suspense>
  );
}
