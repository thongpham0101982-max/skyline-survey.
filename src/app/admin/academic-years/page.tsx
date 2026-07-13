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
  try {
    await prisma.$transaction(async (tx) => {
      // 1. TaskComments and TaskAttachments of WorkTasks of this year
      const taskIds = (await tx.workTask.findMany({ where: { academicYearId: id }, select: { id: true } })).map(t => t.id);
      if (taskIds.length > 0) {
        await tx.taskComment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.taskAttachment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.workTask.deleteMany({ where: { academicYearId: id } });
      }

      // 2. WeeklyReportItems of WeeklyReports of this year
      const reportIds = (await tx.weeklyReport.findMany({ where: { academicYearId: id }, select: { id: true } })).map(r => r.id);
      if (reportIds.length > 0) {
        await tx.weeklyReportItem.deleteMany({ where: { reportId: { in: reportIds } } });
        await tx.weeklyReport.deleteMany({ where: { academicYearId: id } });
      }

      // 3. SubjectQuotas of this year
      await tx.subjectQuota.deleteMany({ where: { academicYearId: id } });

      // 4. TeachingAssignments of this year
      await tx.teachingAssignment.deleteMany({ where: { academicYearId: id } });

      // 5. InputAssessment periods, batches, students, assignments, scores
      const periodIds = (await tx.inputAssessmentPeriod.findMany({ where: { academicYearId: id }, select: { id: true } })).map(p => p.id);
      if (periodIds.length > 0) {
        await tx.inputAssessmentTeacherAssignment.deleteMany({ where: { periodId: { in: periodIds } } });
        
        const studentIds = (await tx.inputAssessmentStudent.findMany({ where: { periodId: { in: periodIds } }, select: { id: true } })).map(s => s.id);
        if (studentIds.length > 0) {
          await tx.studentAssessmentScore.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.inputAssessmentStudent.deleteMany({ where: { id: { in: studentIds } } });
        }
        await tx.inputAssessmentBatch.deleteMany({ where: { periodId: { in: periodIds } } });
        await tx.inputAssessmentPeriod.deleteMany({ where: { academicYearId: id } });
      }

      // 6. PreschoolInputAssessment periods, batches, students, assignments, scores
      const prePeriodIds = (await tx.preschoolInputAssessmentPeriod.findMany({ where: { academicYearId: id }, select: { id: true } })).map(p => p.id);
      if (prePeriodIds.length > 0) {
        await (tx as any).preschoolInputAssessmentTeacherAssignment.deleteMany({ where: { periodId: { in: prePeriodIds } } });
        
        const preStudentIds = (await (tx as any).preschoolInputAssessmentStudent.findMany({ where: { periodId: { in: prePeriodIds } }, select: { id: true } })).map(s => s.id);
        if (preStudentIds.length > 0) {
          await (tx as any).preschoolDevScore.deleteMany({ where: { studentId: { in: preStudentIds } } });
          await (tx as any).preschoolInputAssessmentStudent.deleteMany({ where: { id: { in: preStudentIds } } });
        }
        await (tx as any).preschoolInputAssessmentBatch.deleteMany({ where: { periodId: { in: prePeriodIds } } });
        await (tx as any).preschoolInputAssessmentPeriod.deleteMany({ where: { academicYearId: id } });
      }

      // 7. SurveyPeriods, forms, responses, summaries
      const surveyPeriodIds = (await tx.surveyPeriod.findMany({ where: { academicYearId: id }, select: { id: true } })).map(p => p.id);
      if (surveyPeriodIds.length > 0) {
        await tx.surveyQuestion.deleteMany({ where: { surveyPeriodId: { in: surveyPeriodIds } } });
        await tx.summarySystem.deleteMany({ where: { surveyPeriodId: { in: surveyPeriodIds } } });
        await tx.summaryByClass.deleteMany({ where: { surveyPeriodId: { in: surveyPeriodIds } } });
        await tx.summaryByCampus.deleteMany({ where: { surveyPeriodId: { in: surveyPeriodIds } } });

        const formIds = (await tx.surveyForm.findMany({ where: { surveyPeriodId: { in: surveyPeriodIds } }, select: { id: true } })).map(f => f.id);
        if (formIds.length > 0) {
          await tx.surveyResponse.deleteMany({ where: { formId: { in: formIds } } });
          await tx.surveyForm.deleteMany({ where: { id: { in: formIds } } });
        }
        await tx.surveyPeriod.deleteMany({ where: { academicYearId: id } });
      }

      // 8. Students, transfers, parent links
      const dbStudentIds = (await tx.student.findMany({ where: { academicYearId: id }, select: { id: true } })).map(s => s.id);
      if (dbStudentIds.length > 0) {
        await tx.studentTransfer.deleteMany({ where: { studentId: { in: dbStudentIds } } });
        await tx.parentStudentLink.deleteMany({ where: { studentId: { in: dbStudentIds } } });
        await tx.student.deleteMany({ where: { academicYearId: id } });
      }

      // 9. Classes, teacher assignments
      const classIds = (await tx.class.findMany({ where: { academicYearId: id }, select: { id: true } })).map(c => c.id);
      if (classIds.length > 0) {
        await tx.teacherClassAssignment.deleteMany({ where: { classId: { in: classIds } } });
        await tx.class.deleteMany({ where: { academicYearId: id } });
      }

      // 10. EducationSystems, configs
      await tx.educationSystem.deleteMany({ where: { academicYearId: id } });
      await tx.assessmentConfig.deleteMany({ where: { academicYearId: id } });
      if ((tx as any).preschoolAssessmentConfig) {
        await (tx as any).preschoolAssessmentConfig.deleteMany({ where: { academicYearId: id } });
      }

      // 11. Finally, AcademicYear
      await tx.academicYear.delete({ where: { id } });
    });
  } catch (error: any) {
    console.error("Failed to delete academic year cascadingly:", error);
    throw new Error("Không thể xóa năm học này do lỗi dữ liệu liên quan: " + error.message);
  }
  revalidatePath("/admin/academic-years")
}

async function setActiveYear(id) {
  "use server"
  await prisma.academicYear.updateMany({ data: { status: "INACTIVE" } })
  await prisma.academicYear.update({ where: { id }, data: { status: "ACTIVE", isOff: false } })
  revalidatePath("/admin/academic-years")
  revalidatePath("/admin/teachers")
  revalidatePath("/admin/parents")
}

async function toggleYearOffStatus(id, isOff) {
  "use server"
  if (isOff) {
    const activeYear = await prisma.academicYear.findFirst({ where: { id, status: "ACTIVE" } })
    await prisma.academicYear.update({ where: { id }, data: { isOff, status: "INACTIVE" } })
    if (activeYear) {
      const anotherOpenYear = await prisma.academicYear.findFirst({
        where: { id: { not: id }, isOff: false },
        orderBy: { startDate: "desc" }
      })
      if (anotherOpenYear) {
        await prisma.academicYear.updateMany({ data: { status: "INACTIVE" } })
        await prisma.academicYear.update({ where: { id: anotherOpenYear.id }, data: { status: "ACTIVE" } })
      }
    }
  } else {
    await prisma.academicYear.update({ where: { id }, data: { isOff } })
  }
  revalidatePath("/admin/academic-years")
}

export default async function AcademicYearsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { classes: true, students: true } },
      educationSystems: { orderBy: { createdAt: 'asc' } }
    }
  })

  const yearsWithCounts = await Promise.all(years.map(async (y) => {
    const classes = await prisma.class.findMany({
      where: { academicYearId: y.id },
      select: { id: true, homeroomTeacherId: true }
    })
    
    const classIds = classes.map(c => c.id)
    const teacherIds = new Set()
    
    classes.forEach(c => {
      if (c.homeroomTeacherId) {
        c.homeroomTeacherId.split(',').forEach(id => {
          const tid = id.trim()
          if (tid) teacherIds.add(tid)
        })
      }
    })
    
    if (classIds.length > 0) {
      const tcas = await prisma.teacherClassAssignment.findMany({
        where: { classId: { in: classIds } },
        select: { teacherId: true }
      })
      tcas.forEach(t => teacherIds.add(t.teacherId))
    }
    
    const tas = await prisma.teachingAssignment.findMany({
      where: { academicYearId: y.id },
      select: { teacherId: true }
    })
    tas.forEach(t => teacherIds.add(t.teacherId))
    
    return {
      ...y,
      teacherCount: teacherIds.size,
      parentCount: 0
    }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Năm học</h1>
        <p className="text-slate-500 mt-2 text-sm">Mọi tài khoản Phụ huynh và Giáo viên đều thuộc về một Năm học cụ thể.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-100">
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
          <button type="submit" className="w-full bg-[#00A99D] text-white font-bold py-2.5 px-4 rounded-xl hover:bg-[#009085] transition-colors shadow-md shadow-indigo-500/20">
            Tạo Năm học
          </button>
        </form>
      </div>

      <AcademicYearsClient initialYears={yearsWithCounts} updateAction={updateAcademicYear} deleteAction={deleteAcademicYear} setActiveAction={setActiveYear} toggleOffAction={toggleYearOffStatus} />
    </div>
  )
}