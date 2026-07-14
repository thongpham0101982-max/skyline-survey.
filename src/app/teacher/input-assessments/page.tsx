import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeacherAssessmentsClient from "./client"
import { prisma } from "@/lib/db"
import { isRedirectError } from "next/dist/client/components/redirect"

export default async function TeacherAssessmentsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }
  
  const role = session.user.role;
  const isAuthorizedRole = role === "TEACHER" || role === "GV_MN" || role === "ADMIN" || role === "Teacher" || role === "Admin" || ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS", "GĐCS"].includes(role);
  
  if (!isAuthorizedRole) {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
      if (!teacher) {
        redirect("/");
      }
    } catch (e) {
      if (isRedirectError(e)) throw e;
      redirect("/");
    }
  }

  return <TeacherAssessmentsClient user={session.user} />
}
