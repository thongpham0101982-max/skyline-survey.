export const dynamic = "force-dynamic"
export const revalidate = 0
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  let role = (session.user as any)?.role || "PARENT"
  try {
    if (session.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })
      if (dbUser?.role) {
        role = dbUser.role
      }
    }
  } catch (e) {}

  const upperRole = role.toUpperCase().trim()
  
  if (upperRole === "STUDENT") {
    redirect("/hocsinh/hs-khaosat/danh-sach")
  } else if (upperRole === "PARENT") {
    redirect("/parent")
  } else {
    // Yêu cầu: "khi login sẽ trực tiếp đến trang Tổng quan cá nhân, là trang mặc định home"
    // Toàn bộ giáo viên và nhân sự nội bộ khi truy cập trang chủ mặc định (/) sẽ trực tiếp đến trang Tổng quan cá nhân (/teacher)
    redirect("/teacher")
  }
}
