import { Suspense } from "react";
import KetQuaClient from "./client";

export const metadata = {
  title: "Tra cứu Kết quả học tập (6 kỳ) | Sky-Line SQMS",
  description: "Tra cứu kết quả học tập qua 6 mốc: KSDV, KSĐN, GK1, CK1, GK2, CK2",
};

export default function KetQuaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải...</div>}>
      <KetQuaClient />
    </Suspense>
  );
}
