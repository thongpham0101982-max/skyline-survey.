import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const role = (session.user as any)?.role || "PARENT"
  
  if (role === "STUDENT") {
    redirect("/Hocsinh/khaosat")
  } else if (["TEACHER", "GV_MN", "GVCN_PT", "GVBM_PT"].includes(role)) {
    redirect("/teacher/classes")
  } else if (role === "PARENT") {
    redirect("/parent")
  } else if (role === "KT_DBCL") {
    redirect("/admin/surveys")
  } else {
    // Let's also check if they have a Teacher record defensively
    try {
      const { prisma } = require("@/lib/db");
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
      if (teacher) {
        redirect("/teacher/classes");
      }
    } catch (e) {
      console.error("Defensive teacher redirect check failed:", e);
    }
    // ADMIN and other staff roles
    redirect("/admin")
  }
}
