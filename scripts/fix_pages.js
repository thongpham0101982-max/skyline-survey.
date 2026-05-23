const fs = require("fs");

// Fix academic-years/page.tsx - remove parents/teachers from _count since schema not regenerated
const ayPage = `import { prisma } from "@/lib/db"
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
      _count: { select: { classes: true, students: true } }
    }
  })

  // Get teacher/parent counts per year via raw SQL (since Prisma client may not have new relations yet)
  const teacherCounts = await prisma.$queryRaw\`
    SELECT academicYearId, COUNT(*) as cnt FROM Teacher WHERE academicYearId IS NOT NULL GROUP BY academicYearId
  \`
  const parentCounts = await prisma.$queryRaw\`
    SELECT academicYearId, COUNT(*) as cnt FROM Parent WHERE academicYearId IS NOT NULL GROUP BY academicYearId
  \`

  const yearsWithCounts = years.map(y => ({
    ...y,
    teacherCount: Number((teacherCounts.find(r => r.academicYearId === y.id))?.cnt ?? 0),
    parentCount: Number((parentCounts.find(r => r.academicYearId === y.id))?.cnt ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Nam hoc</h1>
        <p className="text-slate-500 mt-2 text-sm">Moi tai khoan Phu huynh va Giao vien deu thuoc ve mot Nam hoc cu the.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-base font-bold mb-4 text-slate-800">Tao Nam hoc Moi</h2>
        <form action={createAcademicYear} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ten Nam hoc</label>
            <input name="name" type="text" required placeholder="2025-2026" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngay bat dau</label>
            <input name="startDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngay ket thuc</label>
            <input name="endDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
            Tao Nam hoc
          </button>
        </form>
      </div>

      <AcademicYearsClient initialYears={yearsWithCounts} updateAction={updateAcademicYear} deleteAction={deleteAcademicYear} setActiveAction={setActiveYear} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/academic-years/page.tsx", ayPage, "utf8");
console.log("academic-years/page.tsx fixed");

// Fix teachers/page.tsx - use raw SQL for academicYear instead of include
const teacherPage = `import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = { title: "Quan ly Giao vien | Admin Portal" }

export default async function TeacherManagerPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  // Get teachers with user info (no include of academicYear since Prisma client not regenerated)
  const teachers = await prisma.teacher.findMany({
    orderBy: { teacherName: "asc" },
    include: {
      user: { select: { email: true, status: true } }
    }
  })

  // Get academicYearId for each teacher via raw SQL
  const yearMappings = await prisma.$queryRaw\`
    SELECT id, academicYearId FROM Teacher
  \` as { id: string, academicYearId: string | null }[]

  const yearMap = new Map(yearMappings.map(r => [r.id, r.academicYearId]))
  const yearsById = new Map(years.map(y => [y.id, y]))

  const teachersWithYear = teachers.map(t => ({
    ...t,
    academicYear: yearMap.get(t.id) ? yearsById.get(yearMap.get(t.id)) ?? null : null
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Giao vien</h1>
        <p className="text-slate-500 mt-2 text-sm">Them, chinh sua thong tin giao vien theo Tung Nam hoc.</p>
      </div>
      <TeacherManagerClient initialTeachers={teachersWithYear} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/teachers/page.tsx", teacherPage, "utf8");
console.log("teachers/page.tsx fixed");

// Fix parents/page.tsx 
const parentsPage = `import { prisma } from "@/lib/db"
import { ParentAccountsClient } from "./client"

export default async function ParentAccountsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  const classes = await prisma.class.findMany({
    include: { campus: true, academicYear: { select: { id: true, name: true } } },
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh Muc Tai Khoan PHHS</h1>
        <p className="text-slate-500 mt-2 font-medium">Trung tam khoi tao tai khoan Phu huynh theo Nam hoc.</p>
      </div>
      <ParentAccountsClient classes={classes} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/parents/page.tsx", parentsPage, "utf8");
console.log("parents/page.tsx fixed");

// Also fix academic-years client - use teacherCount/parentCount instead of _count.teachers
const ayClient = `"use client"
import { useState } from "react"
import { Edit2, Check, X, Trash2, Star, Calendar, Users, GraduationCap, BookOpen } from "lucide-react"

export function AcademicYearsClient({ initialYears, updateAction, deleteAction, setActiveAction }) {
  const [years, setYears] = useState(initialYears)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const handleEdit = (y) => {
    setEditingId(y.id)
    setEditForm({
      name: y.name,
      startDate: new Date(y.startDate).toISOString().split("T")[0],
      endDate: new Date(y.endDate).toISOString().split("T")[0]
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      await updateAction({ id, name: editForm.name, startDate: new Date(editForm.startDate), endDate: new Date(editForm.endDate) })
      setYears(years.map(y => y.id === id ? {...y, name: editForm.name, startDate: new Date(editForm.startDate), endDate: new Date(editForm.endDate)} : y))
      setEditingId(null)
    } catch(e) {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(\`Xoa nam hoc "\${name}"? Tai khoan GV/PHHS se bi mat lien ket voi nam hoc nay.\`)) return
    try {
      await deleteAction(id)
      setYears(years.filter(y => y.id !== id))
    } catch(e) {}
  }

  const handleSetActive = async (id) => {
    setSaving(true)
    try {
      await setActiveAction(id)
      setYears(years.map(y => ({...y, status: y.id === id ? "ACTIVE" : "INACTIVE"})))
    } catch(e) {}
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
        <Star className="inline w-4 h-4 mr-1.5 text-amber-500" />
        Nam hoc <strong>ACTIVE</strong> se duoc dung lam mac dinh khi tao tai khoan GV/PHHS moi.
        Click <strong>"Dat Active"</strong> de thay doi nam hoc hien tai.
      </div>

      {years.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Chua co nam hoc nao</p>
          <p className="text-sm mt-1">Hay tao nam hoc dau tien o form ben tren.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(y => {
            const isEditing = editingId === y.id
            const isActive = y.status === "ACTIVE"
            return (
              <div key={y.id} className={\`bg-white rounded-2xl border-2 shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all \${isActive ? "border-indigo-400 shadow-indigo-100" : "border-slate-200"}\`}>
                <div className="flex-shrink-0">
                  {isActive ? (
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white fill-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="border border-indigo-300 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                      <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      <input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-extrabold text-slate-800 text-xl">{y.name}</h3>
                        {isActive && <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">Dang hoat dong</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {new Date(y.startDate).toLocaleDateString("vi-VN")} &rarr; {new Date(y.endDate).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className="font-bold text-slate-800">{y.teacherCount ?? 0}</span>
                      <span className="text-slate-400 text-xs">GV</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="font-bold text-slate-800">{y.parentCount ?? 0}</span>
                      <span className="text-slate-400 text-xs">PHHS</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="font-bold text-slate-800">{y._count?.classes ?? 0}</span>
                      <span className="text-slate-400 text-xs">Lop</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(y.id)} disabled={saving}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {!isActive && (
                        <button onClick={() => handleSetActive(y.id)} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-colors">
                          <Star className="w-3.5 h-3.5" />Dat Active
                        </button>
                      )}
                      <button onClick={() => handleEdit(y)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(y.id, y.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/academic-years/client.tsx", ayClient, "utf8");
console.log("academic-years/client.tsx fixed");

console.log("=== All fixes done ===");
