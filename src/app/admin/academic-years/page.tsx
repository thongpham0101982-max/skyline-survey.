import { PageHeader } from "@/components/PageHeader"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AcademicYearsClient } from "./client"

async function createAcademicYear(formData: FormData) {
  "use server"
  const name = formData.get("name") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const theme = (formData.get("theme") as string || "").trim()
  const defaultPillars = "[{\"id\":\"TRI_TUE\",\"name\":\"Trí tuệ\",\"icon\":\"Brain\",\"color\":\"blue\",\"focus\":\"Phát triển tư duy độc lập, phản biện, sáng tạo khoa học và học tập xuất sắc\"},{\"id\":\"THE_CHAT\",\"name\":\"Thể chất\",\"icon\":\"Activity\",\"color\":\"emerald\",\"focus\":\"Rèn luyện thể lực bền bỉ, phát triển chiều cao và lối sống năng động lành mạnh\"},{\"id\":\"TAM_HON\",\"name\":\"Tâm hồn\",\"icon\":\"Heart\",\"color\":\"rose\",\"focus\":\"Nuôi dưỡng lòng nhân ái, sự trung thực, bản sắc văn hóa Việt và lòng biết ơn\"},{\"id\":\"KY_NANG\",\"name\":\"Kỹ năng\",\"icon\":\"Compass\",\"color\":\"amber\",\"focus\":\"Thành thạo kỹ năng tự lập, sinh tồn, giao tiếp, hợp tác và giải quyết vấn đề\"},{\"id\":\"HOI_NHAP\",\"name\":\"Hội nhập\",\"icon\":\"Globe\",\"color\":\"purple\",\"focus\":\"Năng lực song ngữ quốc tế, tư duy công dân toàn cầu và làm chủ công nghệ số\"}]";

  const initialThemes = theme ? JSON.stringify([
    {
      id: "thm_" + Date.now(),
      type: "CA_NAM",
      typeName: "Cả năm (Chính)",
      title: theme,
      isPrimary: true
    }
  ]) : null;

  try {
    await prisma.academicYear.create({
      data: {
        name,
        startDate,
        endDate,
        theme: theme || null,
        pillars: defaultPillars,
        yearThemes: initialThemes
      }
    })
  } catch(e) {
    console.error("Error creating academic year:", e)
  }
  revalidatePath("/admin/academic-years")
}

async function updateAcademicYear(data: any) {
  "use server"
  const payload: any = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = data.startDate
  if (data.endDate) payload.endDate = data.endDate
  if (data.status) payload.status = data.status
  if (data.theme !== undefined) payload.theme = data.theme
  if (data.pillars !== undefined) payload.pillars = typeof data.pillars === 'string' ? data.pillars : JSON.stringify(data.pillars)
  if (data.yearThemes !== undefined) payload.yearThemes = typeof data.yearThemes === 'string' ? data.yearThemes : JSON.stringify(data.yearThemes)
  await prisma.academicYear.update({ where: { id: data.id }, data: payload })
  revalidatePath("/admin/academic-years")
  revalidatePath("/hocsinh/portal")
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
      <PageHeader
        title="Quản lý Năm học"
        description="Mọi tài khoản Phụ huynh và Giáo viên đều thuộc về một Năm học cụ thể."
        breadcrumbs={[
          { label: "Cấu hình hệ thống" },
          { label: "Năm học" }
        ]}
      />

      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-100">
        <h2 className="text-base font-bold mb-4 text-slate-800">Tạo Năm học Mới</h2>
        <form action={createAcademicYear} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên Năm học *</label>
              <input name="name" type="text" required placeholder="VD: 2026-2027" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày bắt đầu *</label>
              <input name="startDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày kết thúc *</label>
              <input name="endDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-[#48BFE3] text-white font-bold py-2.5 px-4 rounded-xl hover:bg-[#009085] transition-colors shadow-md shadow-indigo-500/20">
                Tạo Năm học
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Chủ đề năm học <span className="text-xs font-normal text-slate-500">(Khẩu hiệu / Thông điệp hành động cho Học sinh Sky-Line)</span></span>
              <span className="text-[11px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">* Sẽ tự động khởi tạo 5 trụ cột chuẩn Sky-Line</span>
            </label>
            <input name="theme" type="text" placeholder="VD: Khát vọng vươn tầm - Vững bước hội nhập toàn cầu" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
        </form>
      </div>

      <AcademicYearsClient initialYears={yearsWithCounts} updateAction={updateAcademicYear} deleteAction={deleteAcademicYear} setActiveAction={setActiveYear} toggleOffAction={toggleYearOffStatus} />
    </div>
  )
}