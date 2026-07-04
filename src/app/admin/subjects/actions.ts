"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createSubject(code: string, name: string, level: string, desc: string, quota?: any, studyPrograms?: string, quotas?: any[]) {
  try {
    const subject = await prisma.subject.create({
      data: { subjectCode: code, subjectName: name, level: level, description: desc, studyPrograms }
    })
    
    // Support the new array of quotas per program
    if (quotas && quotas.length > 0) {
      for (const q of quotas) {
        if (q.academicYearId) {
          await prisma.subjectQuota.create({
            data: {
              subjectId: subject.id,
              academicYearId: q.academicYearId,
              studyProgram: q.studyProgram || "DEFAULT",
              quotaPrimary: q.quotaPrimary || 0, quotaMiddle: q.quotaMiddle || 0, quotaHigh: q.quotaHigh || 0,
              quotaG1: q.quotaG1 || 0, quotaG2: q.quotaG2 || 0, quotaG3: q.quotaG3 || 0, quotaG4: q.quotaG4 || 0, quotaG5: q.quotaG5 || 0,
              quotaG6: q.quotaG6 || 0, quotaG7: q.quotaG7 || 0, quotaG8: q.quotaG8 || 0, quotaG9: q.quotaG9 || 0,
              quotaG10: q.quotaG10 || 0, quotaG11: q.quotaG11 || 0, quotaG12: q.quotaG12 || 0
            }
          })
        }
      }
    } else if (quota && quota.academicYearId) {
      await prisma.subjectQuota.create({
        data: {
          subjectId: subject.id,
          academicYearId: quota.academicYearId,
          studyProgram: quota.studyProgram || "DEFAULT",
          quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0,
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

export async function updateSubject(id: string, code: string, name: string, level: string, desc: string, quota?: any, studyPrograms?: string, quotas?: any[]) {
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data: { subjectCode: code, subjectName: name, level: level, description: desc, studyPrograms }
    })
    
    // Support the new array of quotas per program
    if (quotas && quotas.length > 0) {
      // For simplicity, delete existing quotas for this year and recreate them to sync with selected programs
      const academicYearId = quotas[0]?.academicYearId;
      if (academicYearId) {
        await prisma.subjectQuota.deleteMany({
          where: { subjectId: id, academicYearId }
        });
        
        for (const q of quotas) {
          if (q.academicYearId) {
            await prisma.subjectQuota.create({
              data: {
                subjectId: id,
                academicYearId: q.academicYearId,
                studyProgram: q.studyProgram || "DEFAULT",
                quotaPrimary: q.quotaPrimary || 0, quotaMiddle: q.quotaMiddle || 0, quotaHigh: q.quotaHigh || 0,
                quotaG1: q.quotaG1 || 0, quotaG2: q.quotaG2 || 0, quotaG3: q.quotaG3 || 0, quotaG4: q.quotaG4 || 0, quotaG5: q.quotaG5 || 0,
                quotaG6: q.quotaG6 || 0, quotaG7: q.quotaG7 || 0, quotaG8: q.quotaG8 || 0, quotaG9: q.quotaG9 || 0,
                quotaG10: q.quotaG10 || 0, quotaG11: q.quotaG11 || 0, quotaG12: q.quotaG12 || 0
              }
            })
          }
        }
      }
    } else if (quota && quota.academicYearId) {
      const existingQuota = await prisma.subjectQuota.findUnique({
        where: { subjectId_academicYearId_studyProgram: { subjectId: id, academicYearId: quota.academicYearId, studyProgram: quota.studyProgram || "DEFAULT" } }
      })
      if (existingQuota) {
        await prisma.subjectQuota.update({
          where: { id: existingQuota.id },
          data: { quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0, quotaG1: quota.quotaG1 || 0, quotaG2: quota.quotaG2 || 0, quotaG3: quota.quotaG3 || 0, quotaG4: quota.quotaG4 || 0, quotaG5: quota.quotaG5 || 0, quotaG6: quota.quotaG6 || 0, quotaG7: quota.quotaG7 || 0, quotaG8: quota.quotaG8 || 0, quotaG9: quota.quotaG9 || 0, quotaG10: quota.quotaG10 || 0, quotaG11: quota.quotaG11 || 0, quotaG12: quota.quotaG12 || 0 }
        })
      } else {
        await prisma.subjectQuota.create({
          data: {
            subjectId: id,
            academicYearId: quota.academicYearId,
            studyProgram: quota.studyProgram || "DEFAULT",
            quotaPrimary: quota.quotaPrimary || 0, quotaMiddle: quota.quotaMiddle || 0, quotaHigh: quota.quotaHigh || 0, quotaG1: quota.quotaG1 || 0, quotaG2: quota.quotaG2 || 0, quotaG3: quota.quotaG3 || 0, quotaG4: quota.quotaG4 || 0, quotaG5: quota.quotaG5 || 0, quotaG6: quota.quotaG6 || 0, quotaG7: quota.quotaG7 || 0, quotaG8: quota.quotaG8 || 0, quotaG9: quota.quotaG9 || 0, quotaG10: quota.quotaG10 || 0, quotaG11: quota.quotaG11 || 0, quotaG12: quota.quotaG12 || 0
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
