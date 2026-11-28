"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { normalizeSubjectForImport, removeVietnameseTones } from "@/lib/subject-mapping"
import { requireAdminOrLeadershipSession } from "@/lib/security-guard"

function isPureKsdvCategory(cat?: string | null): boolean {
  const tokens = (cat || "")
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
  return tokens.length > 0 && tokens.every(t => t === "KSDV")
}

function normalizeSubjectLabelForComparison(rawName: string): string {
  const stripped = removeVietnameseTones(rawName || "")
    .replace(/^mon\s+/i, "")
    .replace(/\bmy\s*thuat\b/g, "mithuat")
    .replace(/[^a-z0-9]+/g, "")
  return stripped
}

function normalizeCanonicalStudyProgram(raw?: string | null): string {
  const s = String(raw || "").trim()
  const lower = s.toLowerCase()
  if (!s) return "Hệ S"
  if (
    s === "Hệ I" ||
    s === "SB" ||
    s === "HNG" ||
    s === "MNG" ||
    lower.includes("hệ i") ||
    lower.includes("song bằng") ||
    lower.includes("song bang") ||
    lower.includes("quốc tế") ||
    lower.includes("quoc te")
  ) {
    return "Hệ I"
  }
  return "Hệ S"
}

function deduplicateQuotasByYearAndProgram(quotas: any[]): any[] {
  const byKey = new Map<string, any>()
  for (const q of quotas || []) {
    if (!q?.academicYearId) continue
    const prog = normalizeCanonicalStudyProgram(q.studyProgram)
    const key = `${q.academicYearId}::${prog}`
    byKey.set(key, { ...q, studyProgram: prog })
  }
  return Array.from(byKey.values())
}

function formatPrismaSaveError(e: any): string {
  if (e?.code === "P2002") {
    const rawDetail = `${JSON.stringify(e?.meta || {})} ${String(e?.message || "")}`
    if (/subjectCode/i.test(rawDetail)) {
      return "Mã môn học này đã tồn tại trong hệ thống!"
    }
    if (/SubjectQuota|studyProgram/i.test(rawDetail)) {
      return "Định mức tiết của hệ đào tạo này bị trùng lặp trong cùng năm học!"
    }
    return "Dữ liệu bị trùng khóa duy nhất trong hệ thống!"
  }
  return e?.message || "Lỗi không xác định khi lưu môn học."
}

async function validateUniqueSubject(
  code: string,
  name: string,
  category?: string,
  excludeId?: string
): Promise<string | null> {
  const cleanCode = (code || "").trim()
  const cleanName = (name || "").trim()
  if (!cleanCode || !cleanName) {
    return "Vui lòng nhập đầy đủ Mã môn học và Tên môn học!"
  }

  const allSubjects = await prisma.subject.findMany({
    select: { id: true, subjectCode: true, subjectName: true, category: true }
  })
  const currentSelf = excludeId ? allSubjects.find(s => s.id === excludeId) : undefined
  const others = excludeId ? allSubjects.filter(s => s.id !== excludeId) : allSubjects

  // 1. Chặn trùng mã môn không phân biệt hoa thường (ví dụ: TAV vs TAv, ana vs ANA)
  const codeConflict = others.find(
    s => s.subjectCode.trim().toLowerCase() === cleanCode.toLowerCase()
  )
  if (codeConflict) {
    return `Mã môn học "${cleanCode}" bị trùng với môn hiện có [${codeConflict.subjectCode} - ${codeConflict.subjectName}]. Mỗi môn học chỉ sử dụng duy nhất 1 mã!`
  }

  const targetIsPureKsdv = isPureKsdvCategory(category)
  if (!targetIsPureKsdv) {
    const targetNormName = normalizeSubjectLabelForComparison(cleanName)
    const selfNormName = currentSelf ? normalizeSubjectLabelForComparison(currentSelf.subjectName) : ""

    // 2. Chặn trùng tên môn học chuẩn hóa trong nhóm môn giảng dạy (nếu đổi sang tên trùng môn khác)
    if (targetNormName && targetNormName !== selfNormName) {
      const nameConflict = others.find(
        s => !isPureKsdvCategory(s.category) && normalizeSubjectLabelForComparison(s.subjectName) === targetNormName
      )
      if (nameConflict) {
        return `Môn học "${cleanName}" đã tồn tại với mã chuẩn duy nhất [${nameConflict.subjectCode} - ${nameConflict.subjectName}]. Vui lòng sử dụng mã hiện có thay vì tạo mới!`
      }
    }

    // 3. Chặn tạo lại các mã alias tương đương của môn đã có trong danh mục chuẩn
    const isUnchangedSelfCode =
      Boolean(currentSelf) &&
      currentSelf!.subjectCode.trim().toLowerCase() === cleanCode.toLowerCase()
    if (!isUnchangedSelfCode) {
      const mappedByCode = normalizeSubjectForImport(cleanCode)
      if (mappedByCode && !mappedByCode.isSubSubject) {
        const canonicalExisting = others.find(
          s => !isPureKsdvCategory(s.category) && s.subjectCode.trim().toUpperCase() === mappedByCode.code.toUpperCase()
        )
        if (canonicalExisting) {
          return `Mã "${cleanCode}" thuộc cùng một môn học đã có mã chuẩn duy nhất [${canonicalExisting.subjectCode} - ${canonicalExisting.subjectName}]. Không được tạo 2 mã cho cùng 1 môn học!`
        }
      }
    }
  }

  return null
}

function normalizeDecimalInput(v: any): number | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) / 100 : null
  const clean = String(v).trim().replace(/\*/g, "").replace(/,/g, ".")
  if (!clean) return null
  const num = Number(clean)
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : null
}

function parseOptionalFloat(v: any): number | null {
  return normalizeDecimalInput(v)
}

function parseQuotaFloat(v: any): number {
  const parsed = normalizeDecimalInput(v)
  return parsed !== null && parsed >= 0 ? parsed : 0
}

function buildQuotaData(q: any) {
  return {
    quotaPrimary: parseQuotaFloat(q.quotaPrimary),
    quotaMiddle: parseQuotaFloat(q.quotaMiddle),
    quotaHigh: parseQuotaFloat(q.quotaHigh),
    quotaG1: parseQuotaFloat(q.quotaG1),
    quotaG2: parseQuotaFloat(q.quotaG2),
    quotaG3: parseQuotaFloat(q.quotaG3),
    quotaG4: parseQuotaFloat(q.quotaG4),
    quotaG5: parseQuotaFloat(q.quotaG5),
    quotaG6: parseQuotaFloat(q.quotaG6),
    quotaG7: parseQuotaFloat(q.quotaG7),
    quotaG8: parseQuotaFloat(q.quotaG8),
    quotaG9: parseQuotaFloat(q.quotaG9),
    quotaG10: parseQuotaFloat(q.quotaG10),
    quotaG11: parseQuotaFloat(q.quotaG11),
    quotaG12: parseQuotaFloat(q.quotaG12),
    quotaG10TN: parseOptionalFloat(q.quotaG10TN),
    quotaG10XH: parseOptionalFloat(q.quotaG10XH),
    quotaG11TN: parseOptionalFloat(q.quotaG11TN),
    quotaG11XH: parseOptionalFloat(q.quotaG11XH),
    quotaG12TN: parseOptionalFloat(q.quotaG12TN),
    quotaG12XH: parseOptionalFloat(q.quotaG12XH),
    specialNoteFlags: typeof q.specialNoteFlags === "string" ? q.specialNoteFlags : "",
  }
}

async function ensureSubjectTimetableColumn() {
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Subject" ADD COLUMN "isTimetableSchedulable" INTEGER NOT NULL DEFAULT 1`
    )
  } catch {
    // Column already exists
  }
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "SubjectQuota" ADD COLUMN "teacherSplitJson" TEXT NOT NULL DEFAULT ''`
    )
  } catch {
    // Column already exists
  }
}

async function persistQuotaTeacherSplit(quotaId: string, rawSplitJson: unknown) {
  const splitStr = typeof rawSplitJson === "string" ? rawSplitJson : ""
  if (typeof (prisma as any).$executeRawUnsafe === "function") {
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "SubjectQuota" SET "teacherSplitJson" = ? WHERE "id" = ?`,
      splitStr,
      quotaId
    )
  }
}

export async function createSubject(
  code: string, name: string, level: string, desc: string,
  quota?: any, studyPrograms?: string, quotas?: any[],
  parentId?: string | null, category?: string, evaluationType?: string,
  isTimetableSchedulable?: boolean
) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await ensureSubjectTimetableColumn()
    const cleanCode = code.trim()
    const cleanName = name.trim()
    const dupError = await validateUniqueSubject(cleanCode, cleanName, category)
    if (dupError) return { success: false, error: dupError }

    const subject = await prisma.subject.create({
      data: {
        subjectCode: cleanCode,
        subjectName: cleanName,
        level,
        description: desc,
        studyPrograms,
        parentId: parentId || null,
        category: category || "MOET",
        evaluationType: evaluationType || "SCORE"
      }
    })

    const schedVal =
      isPureKsdvCategory(category)
        ? 0
        : isTimetableSchedulable === undefined
        ? 1
        : isTimetableSchedulable
        ? 1
        : 0
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "Subject" SET "isTimetableSchedulable" = ? WHERE "id" = ?`,
      schedVal,
      subject.id
    )

    if (quotas && quotas.length > 0) {
      const uniqueQuotas = deduplicateQuotasByYearAndProgram(quotas)
      for (const q of uniqueQuotas) {
        const savedQ = await prisma.subjectQuota.upsert({
          where: {
            subjectId_academicYearId_studyProgram: {
              subjectId: subject.id,
              academicYearId: q.academicYearId,
              studyProgram: q.studyProgram
            }
          },
          update: buildQuotaData(q),
          create: {
            subjectId: subject.id,
            academicYearId: q.academicYearId,
            studyProgram: q.studyProgram,
            ...buildQuotaData(q)
          }
        })
        await persistQuotaTeacherSplit(savedQ.id, q.teacherSplitJson)
      }
    } else if (quota && quota.academicYearId) {
      const prog = normalizeCanonicalStudyProgram(quota.studyProgram)
      const savedQ = await prisma.subjectQuota.upsert({
        where: {
          subjectId_academicYearId_studyProgram: {
            subjectId: subject.id,
            academicYearId: quota.academicYearId,
            studyProgram: prog
          }
        },
        update: buildQuotaData(quota),
        create: {
          subjectId: subject.id,
          academicYearId: quota.academicYearId,
          studyProgram: prog,
          ...buildQuotaData(quota)
        }
      })
      await persistQuotaTeacherSplit(savedQ.id, quota.teacherSplitJson)
    }
    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true, subject }
  } catch (e: any) {
    return { success: false, error: formatPrismaSaveError(e) };
  }
}

export async function updateSubject(
  id: string, code: string, name: string, level: string, desc: string,
  quota?: any, studyPrograms?: string, quotas?: any[],
  parentId?: string | null, category?: string, evaluationType?: string,
  isTimetableSchedulable?: boolean
) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await ensureSubjectTimetableColumn()
    const cleanCode = code.trim()
    const cleanName = name.trim()
    const dupError = await validateUniqueSubject(cleanCode, cleanName, category, id)
    if (dupError) return { success: false, error: dupError }

    const safeParentId = parentId === id ? null : (parentId === undefined ? undefined : (parentId || null))

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        subjectCode: cleanCode,
        subjectName: cleanName,
        level,
        description: desc,
        studyPrograms,
        parentId: safeParentId,
        category: category || "MOET",
        evaluationType: evaluationType || "SCORE"
      }
    })

    if (isPureKsdvCategory(category)) {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE "Subject" SET "isTimetableSchedulable" = 0 WHERE "id" = ?`,
        id
      )
    } else if (isTimetableSchedulable !== undefined) {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE "Subject" SET "isTimetableSchedulable" = ? WHERE "id" = ?`,
        isTimetableSchedulable ? 1 : 0,
        id
      )
    }

    if (quotas && quotas.length > 0) {
      const uniqueQuotas = deduplicateQuotasByYearAndProgram(quotas)
      const yearIds = Array.from(new Set(uniqueQuotas.map(q => q.academicYearId)))
      for (const yearId of yearIds) {
        await prisma.subjectQuota.deleteMany({ where: { subjectId: id, academicYearId: yearId } })
      }
      for (const q of uniqueQuotas) {
        const createdQ = await prisma.subjectQuota.create({
          data: {
            subjectId: id,
            academicYearId: q.academicYearId,
            studyProgram: q.studyProgram,
            ...buildQuotaData(q)
          }
        })
        await persistQuotaTeacherSplit(createdQ.id, q.teacherSplitJson)
      }
    } else if (Array.isArray(quotas) && quotas.length === 0 && isPureKsdvCategory(category)) {
      await prisma.subjectQuota.deleteMany({ where: { subjectId: id } })
    } else if (quota && quota.academicYearId) {
      const prog = normalizeCanonicalStudyProgram(quota.studyProgram)
      const existingQuota = await prisma.subjectQuota.findUnique({
        where: { subjectId_academicYearId_studyProgram: { subjectId: id, academicYearId: quota.academicYearId, studyProgram: prog } }
      })
      if (existingQuota) {
        const updatedQ = await prisma.subjectQuota.update({
          where: { id: existingQuota.id },
          data: buildQuotaData(quota)
        })
        await persistQuotaTeacherSplit(updatedQ.id, quota.teacherSplitJson)
      } else {
        const createdQ = await prisma.subjectQuota.create({
          data: {
            subjectId: id,
            academicYearId: quota.academicYearId,
            studyProgram: prog,
            ...buildQuotaData(quota)
          }
        })
        await persistQuotaTeacherSplit(createdQ.id, quota.teacherSplitJson)
      }
    }
    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true, subject }
  } catch (e: any) {
    return { success: false, error: formatPrismaSaveError(e) };
  }
}

export async function toggleSubjectTimetableAction(id: string, isTimetableSchedulable: boolean) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await ensureSubjectTimetableColumn()
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "Subject" SET "isTimetableSchedulable" = ? WHERE "id" = ?`,
      isTimetableSchedulable ? 1 : 0,
      id
    )
    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteSubject(id: string) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await prisma.subject.delete({ where: { id } })
    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function deleteMultipleSubjects(ids: string[]) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await prisma.subject.deleteMany({
      where: { id: { in: ids } }
    })
    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function bulkUpdateSubjects(
  ids: string[],
  data: {
    evaluationType?: string
    category?: string
    level?: string
    parentId?: string | null
    studyPrograms?: string
    academicYearId?: string
    isTimetableSchedulable?: boolean
  }
) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    await ensureSubjectTimetableColumn()
    const updatePayload: any = {}
    if (data.evaluationType) updatePayload.evaluationType = data.evaluationType
    if (data.category) updatePayload.category = data.category
    if (data.level) updatePayload.level = data.level
    if (data.parentId !== undefined) updatePayload.parentId = data.parentId || null
    if (data.studyPrograms !== undefined) updatePayload.studyPrograms = data.studyPrograms

    if (Object.keys(updatePayload).length > 0) {
      await prisma.subject.updateMany({
        where: { id: { in: ids } },
        data: updatePayload
      })
    }

    if (data.isTimetableSchedulable !== undefined && ids.length > 0) {
      const val = data.isTimetableSchedulable ? 1 : 0
      for (const subId of ids) {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE "Subject" SET "isTimetableSchedulable" = ? WHERE "id" = ?`,
          val,
          subId
        )
      }
    }

    if (data.studyPrograms !== undefined && data.academicYearId) {
      const targetProgs = data.studyPrograms
        .split(",")
        .map(p => p.trim())
        .filter(p => p === "Hệ S" || p === "Hệ I")

      if (targetProgs.length > 0) {
        const existingQuotas = await prisma.subjectQuota.findMany({
          where: { subjectId: { in: ids }, academicYearId: data.academicYearId }
        })
        for (const subId of ids) {
          const rows = existingQuotas.filter(q => q.subjectId === subId)
          await prisma.subjectQuota.deleteMany({
            where: {
              subjectId: subId,
              academicYearId: data.academicYearId,
              studyProgram: { notIn: targetProgs }
            }
          })
          for (const prog of targetProgs) {
            const already = rows.find(r => r.studyProgram === prog)
            if (!already) {
              const donor = rows[0]
              await prisma.subjectQuota.create({
                data: {
                  subjectId: subId,
                  academicYearId: data.academicYearId,
                  studyProgram: prog,
                  ...(donor ? buildQuotaData(donor) : buildQuotaData({}))
                }
              })
            }
          }
        }
      }
    }

    revalidatePath('/admin/subjects')
    revalidatePath('/admin/thoi-khoa-bieu')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function toggleKsdvTagForSubjects(ids: string[], attach: boolean) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) return { success: false, error: "Unauthorized" }
    const targets = await prisma.subject.findMany({
      where: { id: { in: ids } },
      select: { id: true, category: true }
    })

    const updatedById: Record<string, string> = {}

    for (const item of targets) {
      const tokens = (item.category || "MOET")
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
      const isPureKsdv = tokens.length > 0 && tokens.every(t => t === "KSDV")
      if (isPureKsdv && !attach) {
        // Giữ nguyên tag chuyên biệt KSĐV nếu không đổi sang danh mục giảng dạy khác
        continue
      }
      const nextSet = new Set(tokens)
      if (attach) {
        nextSet.add("KSDV")
      } else {
        nextSet.delete("KSDV")
      }
      const nextCat = Array.from(nextSet).join(", ") || "MOET"
      if (nextCat !== item.category) {
        await prisma.subject.update({
          where: { id: item.id },
          data: { category: nextCat }
        })
        updatedById[item.id] = nextCat
      }
    }

    revalidatePath('/admin/subjects')
    return { success: true, updatedById }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
