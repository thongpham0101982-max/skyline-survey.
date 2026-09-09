import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ActivityResultInput from "@/app/teacher/experiential-activities/[id]/page"
import { hasModulePermission } from "@/lib/permissions"

export const metadata = { title: "Đánh giá Hoạt động Trải nghiệm | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function AdminActivityResultPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth error in AdminActivityResultPage:", e)
  }

  if (!session) {
    redirect("/login")
  }

  const user = session.user as any
  const userRole = (user?.role || "").toUpperCase().trim()
  const ALLOWED_ROLES = [
    "ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", 
    "KT_DBCL", "KTDBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU", 
    "BGH", "QLCM", "TTCM", "TEACHER", 
    "CTHS", "CONG_TAC_HOC_SINH", "BAN_CTHS"
  ]
  const hasExpPerm = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"])

  if (!ALLOWED_ROLES.some(r => userRole.includes(r)) && !hasExpPerm) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-xl mx-auto mt-20 text-center">
        <h3 className="font-extrabold text-base mb-2">Quyền truy cập hạn chế</h3>
        <p className="text-xs font-semibold">Bạn không có quyền truy cập chức năng này.</p>
      </div>
    )
  }

  return <ActivityResultInput />
}
