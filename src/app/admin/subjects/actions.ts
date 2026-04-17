"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createSubject(code: string, name: string, level: string, desc: string, quota?: any, studyPrograms?: string) {
  try {
    const subject = await prisma.subject.create({
      data: { subjectCode: code, subjectName: name, level: level, description: desc, studyPrograms }
    })
    
    if (quota && quota.academicYearId) {
      await prisma.subjectQuota.create({
        data: {
          subjectId: subject.id,
          academicYearId: quota.academicYearId,
          quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0
        }
      })
    }
    
    revalidatePath('/admin/subjects')
    return { success: true, subject }
  } catch (e: any) { if (e.code === 'P2002') return { success: false, error: 'Mã môn học này đã tồn tại!' }; return { success: false, error: e.message }; }
}

export async function updateSubject(id: string, code: string, name: string, level: string, desc: string, quota?: any, studyPrograms?: string) {
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data: { subjectCode: code, subjectName: name, level: level, description: desc, studyPrograms }
    })
    
    if (quota && quota.academicYearId) {
      const existingQuota = await prisma.subjectQuota.findUnique({
        where: { subjectId_academicYearId: { subjectId: id, academicYearId: quota.academicYearId } }
      })
      if (existingQuota) {
        await prisma.subjectQuota.update({
          where: { id: existingQuota.id },
          data: { quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0 }
        })
      } else {
        await prisma.subjectQuota.create({
          data: {
            subjectId: id,
            academicYearId: quota.academicYearId,
            quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0
          }
        })
      }
    }
    revalidatePath('/admin/subjects')
    return { success: true, subject }
  } catch (e: any) { if (e.code === 'P2002') return { success: false, error: 'Mã môn học này đã tồn tại!' }; return { success: false, error: e.message }; }
}

export async function deleteSubject(id: string) {
  try {
    await prisma.subject.delete({ where: { id } })
    revalidatePath('/admin/subjects')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
