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
          quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0,
          quotaG1: quota.quotaG1 || 0, quotaG2: quota.quotaG2 || 0, quotaG3: quota.quotaG3 || 0, quotaG4: quota.quotaG4 || 0, quotaG5: quota.quotaG5 || 0,
          quotaG6: quota.quotaG6 || 0, quotaG7: quota.quotaG7 || 0, quotaG8: quota.quotaG8 || 0, quotaG9: quota.quotaG9 || 0,
          quotaG10: quota.quotaG10 || 0, quotaG11: quota.quotaG11 || 0, quotaG12: quota.quotaG12 || 0,
          quotaG1: quota.quotaG1 || 0, quotaG2: quota.quotaG2 || 0, quotaG3: quota.quotaG3 || 0, quotaG4: quota.quotaG4 || 0, quotaG5: quota.quotaG5 || 0,
          quotaG6: quota.quotaG6 || 0, quotaG7: quota.quotaG7 || 0, quotaG8: quota.quotaG8 || 0, quotaG9: quota.quotaG9 || 0,
          quotaG10: quota.quotaG10 || 0, quotaG11: quota.quotaG11 || 0, quotaG12: quota.quotaG12 || 0,
          quotaG1: quota.quotaG1 || 0, quotaG2: quota.quotaG2 || 0, quotaG3: quota.quotaG3 || 0, quotaG4: quota.quotaG4 || 0, quotaG5: quota.quotaG5 || 0,
          quotaG6: quota.quotaG6 || 0, quotaG7: quota.quotaG7 || 0, quotaG8: quota.quotaG8 || 0, quotaG9: quota.quotaG9 || 0,
          quotaG10: quota.quotaG10 || 0, quotaG11: quota.quotaG11 || 0, quotaG12: quota.quotaG12 || 0
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
