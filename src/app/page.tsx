export const dynamic = "force-dynamic"
export const revalidate = 0
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const role = (session.user as any)?.role || "PARENT"
  
  if (role === "STUDENT") {
    redirect("/hocsinh/hs-khaosat/danh-sach")
  } else if (["TEACHER", "GV_MN"].includes(role)) {
    redirect("/teacher")
  } else if (role === "PARENT") {
    redirect("/parent")
  } else if (role === "KT_DBCL") {
    redirect("/admin/surveys")
  } else if (["BGH_MN", "BGH MN", "BGH_MAM_NON"].includes(role)) {
    redirect("/admin/xet-duyet-ket-qua")
  } else if (["TVAN", "TVTS"].includes(role)) {
    redirect("/admin/ho-so-hoc-sinh")
  } else if (["GIAO_VU", "GIAO_VU_CS"].includes(role)) {
    redirect("/admin/thoi-khoa-bieu")
  } else if (["GDCS", "GĐCS"].includes(role)) {
    redirect("/admin/xet-duyet-ket-qua")
  } else {
    try {
      const { prisma } = require("@/lib/db");
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
      if (teacher) {
        redirect("/teacher");
      }
    } catch (e) {
      console.error("Defensive teacher redirect check failed:", e);
    }
    if (role !== "ADMIN" && role !== "Admin") {
      redirect("/admin/xet-duyet-ket-qua");
    }
    redirect("/admin")
  }
}
