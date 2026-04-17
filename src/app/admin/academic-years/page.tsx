import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AcademicYearsClient } from "./client"

async function createAcademicYear(formData) {
  "use server"
  const name = formData.get("name")
  const startDate = new Date(formData.get("startDate"))
  const endDate = new Date(formData.get("endDate"))
  try {
    await prisma.academicYear.create({ data: { name, startDate, endDate } })
  } catch(e) {}
  revalidatePath("/admin/academic-years")
}

async function updateAcademicYear(data) {
  "use server"
  const payload = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = data.startDate
  if (data.endDate) payload.endDate = data.endDate
  if (data.status) payload.status = data.status
  await prisma.academicYear.update({ where: { id: data.id }, data: payload })
  revalidatePath("/admin/academic-years")
}

async function deleteAcademicYear(id) {
  "use server"
  await prisma.academicYear.delete({ where: { id } }).catch(()=>{})
  revalidatePath("/admin/academic-years")
}

async function setActiveYear(id) {
  "use server"
  await prisma.academicYear.updateMany({ data: { status: "INACTIVE" } })
  await prisma.academicYear.update({ where: { id }, data: { status: "ACTIVE" } })
  revalidatePath("/admin/academic-years")
  revalidatePath("/admin/teachers")
  revalidatePath("/admin/parents")
}

export default async function AcademicYearsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { classes: true, students: true } },
      educationSystems: { orderBy: { createdAt: 'asc' } }
    }
  })

  const teacherCounts = [] as { academicYearId: string, cnt: bigint }[]
  const parentCounts = [] as { academicYearId: string, cnt: bigint }[]

  const yearsWithCounts = years.map(y => ({
    ...y,
    teacherCount: Number(teacherCounts.find(r => r.academicYearId === y.id)?.cnt ?? 0),
    parentCount: Number(parentCounts.find(r => r.academicYearId === y.id)?.cnt ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Năm học</h1>
        <p className="text-slate-500 mt-2 text-sm">Mọi tài khoản Phụ huynh và Giáo viên đều thuộc về một Năm học cụ thể.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-base font-bold mb-4 text-slate-800">Tạo Năm học Mới</h2>
        <form action={createAcademicYear} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên Năm học</label>
            <input name="name" type="text" required placeholder="2025-2026" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày bắt đầu</label>
            <input name="startDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày kết thúc</label>
            <input name="endDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
            Tạo Năm học
          </button>
        </form>
      </div>

      <AcademicYearsClient initialYears={yearsWithCounts} updateAction={updateAcademicYear} deleteAction={deleteAcademicYear} setActiveAction={setActiveYear} />
    </div>
  )
}