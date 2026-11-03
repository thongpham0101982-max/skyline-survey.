// @ts-nocheck
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeacherAssessmentsClient from "./client"
import { prisma } from "@/lib/db"
import { isRedirectError } from "next/dist/client/components/redirect"
import { Suspense } from "react"

export default async function TeacherAssessmentsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }
  
  const role = (session.user.role || "").toUpperCase();
  const isAuthorizedRole = [
    "TEACHER", "GV_MN", "ADMIN", "SUPERADMIN", "SUPER_ADMIN",
    "KHAO_THI", "KT_DBCL", "KTDBCL", "ĐBCL", "DBCL",
    "GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS", "GĐCS",
    "BGH_MN", "BGH MN", "BGH_MAM_NON", "BGH", "BGH_CS",
    "TBP", "CM", "TO_TRUONG"
  ].includes(role);
  
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

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-teal-600 font-bold">Đang tải dữ liệu khảo sát...</div>}>
      <TeacherAssessmentsClient user={session.user} />
    </Suspense>
  )
}
