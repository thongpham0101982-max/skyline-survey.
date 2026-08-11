export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect"
import { getTimetableMatrixData } from "@/app/admin/thoi-khoa-bieu/actions"
import TeacherTimetableLookupClient from "./client"
import { prisma } from "@/lib/db"

export default async function TimetablePage(props: {
  searchParams: Promise<{ campusId?: string; level?: string }>
}) {
  let session: any = null
  try {
    session = await auth()
  } catch (err) {
    console.error("Auth fail in TimetablePage:", err)
  }

  if (!session) {
    redirect("/login")
  }

  try {
    const searchParams = await props.searchParams
    const initialData = await getTimetableMatrixData(searchParams.campusId, searchParams.level || "TIEU_HOC")

    if (!initialData.success) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-xs">
          Lỗi nạp dữ liệu Thời khóa biểu: {initialData.error || "Không thể tải ma trận Thời khóa biểu."}
        </div>
      )
    }

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    }).catch(() => null)

    if (!currentTeacher && session.user.email) {
      currentTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: session.user.email },
            { teacherCode: session.user.email },
            { teacherCode: session.user.email.split('@')[0] }
          ]
        }
      }).catch(() => null)
    }

    let mySlots: any[] = []
    if (currentTeacher?.id || currentTeacher?.teacherName) {
      mySlots = await prisma.timetableSlot.findMany({
        where: {
          OR: [
            ...(currentTeacher.id ? [{ teacherId: currentTeacher.id }] : []),
            ...(currentTeacher.teacherName ? [{ teacherName: currentTeacher.teacherName }] : [])
          ]
        }
      }).catch(() => [])
    }

    return (
      <TeacherTimetableLookupClient 
        initialData={{ ...initialData, currentTeacher }} 
        mySlots={mySlots} 
      />
    )
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error("Error in TimetablePage:", err)
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-xs">
        Đã xảy ra lỗi khi nạp trang Thời khóa biểu. Vui lòng thử lại sau.
      </div>
    )
  }
}
