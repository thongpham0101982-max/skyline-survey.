import { Suspense } from "react"
import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "./actions"
import { ObservationClient } from "./client"
import { isAssignedSlotCreator } from "./utils"
import { prisma } from "@/lib/db"

export default async function ObservationPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value
  const academicYearId = searchParams.academicYearId || activeYearCookie || undefined
  const level = searchParams.level || "all"
  const grade = searchParams.grade || "all"
  const period = searchParams.period || "all"
  const date = searchParams.date || ""
  const month = searchParams.month || ""
  const divisionCode = searchParams.divisionCode || "all"
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"
  const classId = searchParams.classId || "all"

  const [refDataResult, slotsResult] = await Promise.all([
    getObservationData(academicYearId),
    getObservationSlots({
      academicYearId,
      level,
      grade,
      classId,
      period,
      date,
      month,
      campusId,
      divisionCode,
      deptId
    })
  ])

  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const currentTeacherId = refDataResult.currentTeacher?.id;
  let loadedSlots = slotsResult.success ? (slotsResult.slots || []) : [];

  if (searchParams.slotId && !loadedSlots.some((s: any) => s.id === searchParams.slotId)) {
    try {
      const extraSlot = await prisma.observationSlot.findUnique({
        where: { id: searchParams.slotId },
        include: {
          teacher: {
            select: {
              id: true,
              teacherName: true,
              teacherCode: true,
              email: true,
              departmentId: true,
              departmentRel: true,
              departmentAssignments: { include: { department: true } },
              campusId: true,
              campus: { select: { campusName: true } }
            }
          },
          registrations: {
            include: {
              teacher: {
                select: {
                  id: true,
                  teacherName: true,
                  teacherCode: true,
                  departmentId: true,
                  campusId: true,
                  campus: { select: { campusName: true, campusCode: true } },
                  position: true,
                  departmentAssignments: { select: { departmentId: true, position: true } },
                  email: true
                }
              },
              evaluation: true
            }
          }
        }
      });
      if (extraSlot) {
        loadedSlots = [extraSlot, ...loadedSlots];
      }
    } catch (e) {
      console.error("Failed to load extra slot for deep-link:", e);
    }
  }

  const myPersonalSlots = currentTeacherId
    ? loadedSlots.filter((s: any) => 
        s.teacherId === currentTeacherId || 
        s.registrations?.some((r: any) => r.teacherId === currentTeacherId) ||
        isAssignedSlotCreator(s, currentTeacherId)
      )
    : [];

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Đang tải dữ liệu Dự giờ...</div>}>
      <ObservationClient
      isPreschoolPage={false}
      initialSlots={loadedSlots}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      divisions={refDataResult.divisions || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, classId, period, date, month, campusId, divisionCode, deptId, academicYearId }}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialReceivedEvaluations={refDataResult.myReceivedEvaluations || []}
      initialPersonalSlots={myPersonalSlots}
    />
    </Suspense>
  )
}
