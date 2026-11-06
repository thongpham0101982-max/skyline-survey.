export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginClient } from "./client"

export const metadata = {
  title: "SQMS - Hệ thống Quản trị Chất lượng Trường học",
  description: "Đăng nhập vào Hệ thống Quản trị Chất lượng Trường học (SQMS)"
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    if (role === "STUDENT") {
      redirect("/hocsinh/hs-khaosat/danh-sach")
    } else if (role === "PARENT") {
      redirect("/parent")
    } else {
      // Đã đăng nhập: chuyển trực tiếp đến trang Tổng quan cá nhân
      redirect("/teacher")
    }
  }

  return <LoginClient />
}
