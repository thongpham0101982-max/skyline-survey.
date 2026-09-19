// @ts-nocheck
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

    // Concurrently fetch matrix data and teacher profile
    const [initialData, teacherById, teacherByEmail] = await Promise.all([
      getTimetableMatrixData(searchParams.campusId, searchParams.level || "TIEU_HOC"),
      prisma.teacher.findUnique({ where: { userId: session.user.id } }).catch(() => null),
      session.user.email
        ? prisma.teacher.findFirst({
            where: {
              OR: [
                { email: session.user.email },
                { teacherCode: session.user.email },
                { teacherCode: session.user.email.split('@')[0] }
              ]
            }
          }).catch(() => null)
        : Promise.resolve(null)
    ])

    if (!initialData.success) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-xs">
          Lỗi nạp dữ liệu Thời khóa biểu: {initialData.error || "Không thể tải ma trận Thời khóa biểu."}
        </div>
      )
    }

    const currentTeacher = teacherById || teacherByEmail || null

    // Extract teacher slots directly from loaded matrix slots when possible
    let mySlots: any[] = []
    if (currentTeacher?.id || currentTeacher?.teacherName) {
      const allSlots = initialData.timetableSlots || []
      mySlots = allSlots.filter((s: any) =>
        (currentTeacher.id && s.teacherId === currentTeacher.id) ||
        (currentTeacher.teacherName && s.teacherName === currentTeacher.teacherName)
      )
      // If campus filter restricted matrix slots, fallback to querying teacher personal slots
      if (mySlots.length === 0 && searchParams.campusId) {
        mySlots = await prisma.timetableSlot.findMany({
          where: {
            OR: [
              ...(currentTeacher.id ? [{ teacherId: currentTeacher.id }] : []),
              ...(currentTeacher.teacherName ? [{ teacherName: currentTeacher.teacherName }] : [])
            ]
          }
        }).catch(() => [])
      }
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
