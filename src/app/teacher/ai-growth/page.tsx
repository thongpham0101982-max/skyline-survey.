import { Suspense } from "react"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTeacherGrowthProfile, getInspirationBoardData } from "./actions"
import { TeacherQuestDashboard } from "@/components/ai-growth/TeacherQuestDashboard"

export default async function TeacherAiGrowthPage() {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const [profileResult, boardResult] = await Promise.all([
    getTeacherGrowthProfile(),
    getInspirationBoardData()
  ])

  if (!profileResult.success) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        {profileResult.error || "Không thể tải hồ sơ AI Growth."}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải Hành trình Đổi mới...</div>}>
        <TeacherQuestDashboard
          profileData={profileResult}
          boardData={boardResult}
        />
      </Suspense>
    </div>
  )
}
