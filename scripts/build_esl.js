const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Teacher Page
const teacherPage = `import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getForeignObservationData, getForeignObservationSlots } from "./actions"
import { ForeignObservationClient } from "./client"

export default async function ForeignTeacherObservationPage(props: {
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
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"
  const grade = searchParams.grade || "all"
  const date = searchParams.date || ""
  const month = searchParams.month || ""

  const refDataResult = await getForeignObservationData(academicYearId)
  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const slotsResult = await getForeignObservationSlots({
    academicYearId,
    campusId,
    deptId,
    grade,
    date,
    month
  })

  return (
    <ForeignObservationClient
      currentTeacher={refDataResult.currentTeacher}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
    />
  )
}
`;
fs.writeFileSync(path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'page.tsx'), teacherPage, 'utf8');

// 2. Admin Page
const adminPage = `import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getForeignObservationData, getForeignObservationSlots } from "@/app/teacher/du-gio-gvnn/actions"
import { ForeignObservationClient } from "@/app/teacher/du-gio-gvnn/client"

export default async function AdminForeignTeacherObservationPage(props: {
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
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"
  const grade = searchParams.grade || "all"
  const date = searchParams.date || ""
  const month = searchParams.month || ""

  const refDataResult = await getForeignObservationData(academicYearId)
  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const slotsResult = await getForeignObservationSlots({
    academicYearId,
    campusId,
    deptId,
    grade,
    date,
    month
  })

  return (
    <ForeignObservationClient
      currentTeacher={refDataResult.currentTeacher}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
    />
  )
}
`;
fs.writeFileSync(path.join(rootDir, 'src', 'app', 'admin', 'du-gio-gvnn', 'page.tsx'), adminPage, 'utf8');

console.log('Successfully wrote page.tsx files');
