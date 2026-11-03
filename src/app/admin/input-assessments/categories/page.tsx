import { redirect } from "next/navigation"

export const metadata = { title: "Danh mục Khảo sát | Admin" }
export const dynamic = "force-dynamic"

export default function CategoriesPage() {
  redirect("/admin/cau-hinh-khao-sat?tab=k12")
}
