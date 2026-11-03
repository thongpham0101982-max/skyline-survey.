import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CareerGuidanceClient } from "./client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "QL Huong nghiep | Khao thi & DACL",
  description: "Quan ly nhat ky lam tu van huong nghiep hoc sinh"
}

export default async function CareerGuidanceAdminPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Chuyển hướng sang phân hệ Quản lý Môn học đặc thù (môn GDHN - Giáo dục hướng nghiệp)
  redirect("/admin/special-subjects?subject=GDHN")
}
