import { CategoriesClient } from "./client"

export const metadata = { title: "Danh muc Mon Khao sat | Admin" }
export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Danh muc Mon Khao sat</h1>
        <p className="text-slate-500 mt-1">Quan ly cac mon khao sat nang luc dau vao: Tam ly, Tieng Anh, Toan, Ngu Van...</p>
      </div>
      <CategoriesClient />
    </div>
  )
}