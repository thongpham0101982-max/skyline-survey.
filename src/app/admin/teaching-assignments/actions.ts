"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ensureTimetableSchema } from "@/lib/timetable/schemaInit"
import {
  hydrateSlotsFromAssignments,
  reconcileQuotasAndAssignments,
  type SpecialAssignmentRow,
} from "@/lib/timetable/quotaReconciler"
import {
  isDualGvvnGvnnSubject,
  resolveTeacherGroup,
  type TeacherGroupCode,
} from "@/lib/timetable/teacherGroupHelper"
import type { SlotRecord } from "@/lib/timetable/types"

export async function saveAssignment(data: {
  teacherId: string
  classIds: string[]
  subjectId: string
  academicYearId: string
  semesters: number[]
  weeklyPeriods?: number | null
}) {
  try {
    await ensureTimetableSchema().catch(() => {})

    const [teacherRow, subRow, teacherGroupRaw] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: data.teacherId },
        select: { id: true, teacherCode: true, teacherName: true },
      }),
      prisma.subject.findUnique({
        where: { id: data.subjectId },
        select: { id: true, subjectCode: true, subjectName: true },
      }),
      typeof (prisma as any).$queryRawUnsafe === "function"
        ? ((prisma as any)
            .$queryRawUnsafe(
              `SELECT "teacherGroup" FROM "Teacher" WHERE "id" = ? LIMIT 1`,
              data.teacherId
            )
            .catch(() => []) as Promise<Array<{ teacherGroup?: string | null }>>)
        : Promise.resolve([] as Array<{ teacherGroup?: string | null }>),
    ])

    const targetRole: TeacherGroupCode = resolveTeacherGroup({
      teacherGroup: teacherGroupRaw[0]?.teacherGroup,
      teacherName: teacherRow?.teacherName,
    })

    const hasExplicitPeriods =
      data.weeklyPeriods !== null &&
      data.weeklyPeriods !== undefined &&
      !Number.isNaN(Number(data.weeklyPeriods))
    const normalizedPeriods = hasExplicitPeriods
      ? Math.max(0, Math.round(Number(data.weeklyPeriods) * 100) / 100)
      : null

    const preserveOppositeGroup =
      hasExplicitPeriods ||
      isDualGvvnGvnnSubject({
        subjectCode: subRow?.subjectCode,
        subjectName: subRow?.subjectName,
      })

    if (preserveOppositeGroup && typeof (prisma as any).$queryRawUnsafe === "function") {
      // Only delete existing rows of the SAME teacher group (GVVN vs GVNN), keeping the opposite group intact
      const existingRows = (await (prisma as any)
        .$queryRawUnsafe(
          `SELECT ta."id", ta."classId", ta."semester", ta."teacherRole", t."teacherGroup", t."teacherName"
           FROM "TeachingAssignment" ta
           LEFT JOIN "Teacher" t ON t."id" = ta."teacherId"
           WHERE ta."subjectId" = ? AND ta."academicYearId" = ?`,
          data.subjectId,
          data.academicYearId
        )
        .catch(() => [])) as Array<{
        id: string
        classId: string
        semester: number
        teacherRole?: string | null
        teacherGroup?: string | null
        teacherName?: string | null
      }>

      const targetClassSet = new Set(data.classIds)
      const targetSemSet = new Set(data.semesters)
      const idsToReplace = existingRows
        .filter((r) => {
          if (!targetClassSet.has(r.classId) || !targetSemSet.has(Number(r.semester))) return false
          const rRoleUpper = String(r.teacherRole || "").trim().toUpperCase()
          const rowGroup: TeacherGroupCode =
            rRoleUpper === "GVNN"
              ? "GVNN"
              : rRoleUpper === "GVVN"
                ? "GVVN"
                : resolveTeacherGroup({
                    teacherGroup: r.teacherGroup,
                    teacherName: r.teacherName,
                  })
          return rowGroup === targetRole
        })
        .map((r) => r.id)

      if (idsToReplace.length > 0) {
        await prisma.teachingAssignment.deleteMany({
          where: { id: { in: idsToReplace } },
        })
      }
    } else {
      await prisma.teachingAssignment.deleteMany({
        where: {
          classId: { in: data.classIds },
          subjectId: data.subjectId,
          academicYearId: data.academicYearId,
          semester: { in: data.semesters },
        },
      })
    }

    const added = []
    for (const classId of data.classIds) {
      for (const sem of data.semesters) {
        const a = await prisma.teachingAssignment.create({
          data: {
            teacherId: data.teacherId,
            classId: classId,
            subjectId: data.subjectId,
            academicYearId: data.academicYearId,
            semester: sem,
          },
          include: { subject: true, class: true },
        })
        if (typeof (prisma as any).$executeRawUnsafe === "function") {
          await (prisma as any).$executeRawUnsafe(
            `UPDATE "TeachingAssignment" SET "weeklyPeriods" = ?, "teacherRole" = ? WHERE "id" = ?`,
            normalizedPeriods,
            targetRole,
            a.id
          )
        }
        added.push({
          id: a.id,
          teacherId: a.teacherId,
          classId: a.classId,
          className: a.class.className,
          subjectId: a.subjectId,
          subjectCode: a.subject.subjectCode || "",
          subjectName: a.subject.subjectName,
          academicYearId: a.academicYearId,
          semester: a.semester,
          weeklyPeriods: normalizedPeriods,
          teacherRole: targetRole,
        })
      }
    }

    // Auto-synchronize primary & alternating (luân phiên) slots on DRAFT timetable versions
    try {
      const draftVersions = await prisma.timetableVersion.findMany({
        where: {
          academicYearId: data.academicYearId,
          semester: { in: data.semesters },
          status: "DRAFT",
        },
        select: { id: true },
      })

      const draftVersionIds = draftVersions.map((v) => v.id)
      if (teacherRow && draftVersionIds.length > 0 && data.classIds.length > 0) {
        // For dual GVVN/GVNN subjects, never overwrite slots already assigned to the opposite teacher!
        await prisma.timetableSlot.updateMany({
          where: {
            versionId: { in: draftVersionIds },
            classId: { in: data.classIds },
            subjectId: data.subjectId,
            status: "ACTIVE",
            ...(preserveOppositeGroup ? { teacherId: null } : {}),
          },
          data: {
            teacherId: teacherRow.id,
            teacherName: teacherRow.teacherName,
          },
        })

        if (!preserveOppositeGroup) {
          const altOr: Array<Record<string, unknown>> = [{ altSubjectId: data.subjectId }]
          if (subRow?.subjectName) altOr.push({ altSubjectName: subRow.subjectName })
          if (subRow?.subjectCode) altOr.push({ altSubjectName: subRow.subjectCode })

          await prisma.timetableSlot.updateMany({
            where: {
              versionId: { in: draftVersionIds },
              classId: { in: data.classIds },
              status: "ACTIVE",
              OR: altOr as any,
            },
            data: {
              altSubjectId: data.subjectId,
              altTeacherId: teacherRow.id,
              altTeacherCode: teacherRow.teacherCode || null,
              altTeacherName: teacherRow.teacherName,
            },
          })
        }
      }
    } catch (syncErr) {
      console.error("[saveAssignment] Failed to sync DRAFT timetable slots:", syncErr)
    }

    revalidatePath('/admin/teaching-assignments')
    revalidatePath('/admin/thoi-khoa-bieu', 'layout')
    return {
      success: true as const,
      added,
      preservedOppositeGroup: preserveOppositeGroup,
      targetRole,
    }
  } catch (e: any) {
    return { success: false as const, error: e.message }
  }
}

export async function updateAssignmentWeeklyPeriods(
  id: string,
  weeklyPeriods: number | null
) {
  try {
    await ensureTimetableSchema().catch(() => {})
    const norm =
      weeklyPeriods === null || weeklyPeriods === undefined || Number.isNaN(Number(weeklyPeriods))
        ? null
        : Math.max(0, Math.round(Number(weeklyPeriods) * 100) / 100)
    if (typeof (prisma as any).$executeRawUnsafe === "function") {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE "TeachingAssignment" SET "weeklyPeriods" = ? WHERE "id" = ?`,
        norm,
        id
      )
    }
    revalidatePath('/admin/teaching-assignments')
    revalidatePath('/admin/thoi-khoa-bieu', 'layout')
    return { success: true as const, weeklyPeriods: norm }
  } catch (e: any) {
    return { success: false as const, error: e.message }
  }
}

export async function deleteAssignment(id: string) {
  try {
    await prisma.teachingAssignment.delete({ where: { id } })
    revalidatePath('/admin/teaching-assignments')
    revalidatePath('/admin/thoi-khoa-bieu', 'layout')
    return { success: true as const }
  } catch (e: any) {
    return { success: false as const, error: e.message }
  }
}

export async function syncAllAssignmentsToTimetableAction(academicYearId: string) {
  try {
    if (!academicYearId) {
      return { success: false as const, error: "Vui lòng chọn Năm học cần đồng bộ." }
    }
    await ensureTimetableSchema()

    const draftVersions = await prisma.timetableVersion.findMany({
      where: {
        academicYearId,
        status: "DRAFT",
      },
      select: {
        id: true,
        code: true,
        campusId: true,
        semester: true,
      },
    })

    if (draftVersions.length === 0) {
      return {
        success: true as const,
        versionCount: 0,
        updatedCount: 0,
        filledPrimaryCount: 0,
        filledAltCount: 0,
      }
    }

    const [
      classes,
      subjects,
      rawTeachers,
      rawSubjectQuotas,
      rawAllTas,
      allCtqts,
      rawSpecialRows,
      teacherGroupRows,
      quotaSplitRows,
      taMetaRows,
    ] = await Promise.all([
      prisma.class.findMany({
        where: { academicYearId, status: "ACTIVE" },
        select: {
          id: true,
          className: true,
          grade: true,
          level: true,
          campusId: true,
          educationSystem: true,
          homeroomTeacherId: true,
        },
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          category: true,
        },
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          teacherCode: true,
          teacherName: true,
          campusId: true,
          departmentId: true,
        },
      }),
      prisma.subjectQuota.findMany({ where: { academicYearId } }),
      prisma.teachingAssignment.findMany({ where: { academicYearId } }),
      prisma.ctqtTeachingAssignment
        .findMany({ where: { academicYearId, status: "ACTIVE" } })
        .catch(() => []),
      (prisma as any).specialTeachingAssignment
        ? (prisma as any).specialTeachingAssignment
            .findMany({
              where: { academicYearId, status: "ACTIVE" },
              include: {
                subject: {
                  select: { id: true, code: true, name: true, legacySubjectId: true },
                },
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (prisma as any).$queryRawUnsafe === "function"
        ? ((prisma as any)
            .$queryRawUnsafe(`SELECT "id", "teacherGroup" FROM "Teacher"`)
            .catch(() => []) as Promise<Array<{ id: string; teacherGroup?: string | null }>>)
        : Promise.resolve([] as Array<{ id: string; teacherGroup?: string | null }>),
      typeof (prisma as any).$queryRawUnsafe === "function"
        ? ((prisma as any)
            .$queryRawUnsafe(
              `SELECT "id", "teacherSplitJson" FROM "SubjectQuota" WHERE "academicYearId" = ?`,
              academicYearId
            )
            .catch(() => []) as Promise<Array<{ id: string; teacherSplitJson?: string | null }>>)
        : Promise.resolve([] as Array<{ id: string; teacherSplitJson?: string | null }>),
      typeof (prisma as any).$queryRawUnsafe === "function"
        ? ((prisma as any)
            .$queryRawUnsafe(
              `SELECT "id", "weeklyPeriods", "teacherRole" FROM "TeachingAssignment" WHERE "academicYearId" = ?`,
              academicYearId
            )
            .catch(() => []) as Promise<
            Array<{ id: string; weeklyPeriods?: number | null; teacherRole?: string | null }>
          >)
        : Promise.resolve(
            [] as Array<{ id: string; weeklyPeriods?: number | null; teacherRole?: string | null }>
          ),
    ])

    const groupMap = new Map(teacherGroupRows.map((r) => [r.id, r.teacherGroup || null]))
    const splitMap = new Map(quotaSplitRows.map((r) => [r.id, r.teacherSplitJson || ""]))
    const taMetaMap = new Map(
      taMetaRows.map((r) => [
        r.id,
        {
          weeklyPeriods:
            r.weeklyPeriods !== null && r.weeklyPeriods !== undefined
              ? Number(r.weeklyPeriods)
              : null,
          teacherRole: r.teacherRole || null,
        },
      ])
    )

    const teachers = rawTeachers.map((t) => ({
      ...t,
      teacherGroup: resolveTeacherGroup({
        teacherGroup: groupMap.get(t.id),
        teacherName: t.teacherName,
      }),
    }))
    const subjectQuotas = rawSubjectQuotas.map((q) => ({
      ...q,
      teacherSplitJson: splitMap.get(q.id) || "",
    }))
    const allTas = rawAllTas.map((ta) => {
      const m = taMetaMap.get(ta.id)
      return {
        ...ta,
        weeklyPeriods: m?.weeklyPeriods ?? null,
        teacherRole: m?.teacherRole ?? null,
      }
    })

    const teacherCodeById = new Map(teachers.map((t) => [t.id, t.teacherCode || null]))
    const subjectCodeById = new Map(subjects.map((s) => [s.id, s.subjectCode || null]))

    const allSpecials: SpecialAssignmentRow[] = (rawSpecialRows || []).map((r: any) => ({
      classId: r.classId,
      teacherId: r.teacherId,
      academicYearId: r.academicYearId,
      semester: Number(r.semester || 1),
      legacySubjectId: r.subject?.legacySubjectId || null,
      specialSubjectCode: r.subject?.code || null,
      specialSubjectName: r.subject?.name || null,
    }))

    let totalUpdated = 0
    let totalPrimary = 0
    let totalAlt = 0

    for (const ver of draftVersions) {
      const campusClasses = classes.filter((c) => c.campusId === ver.campusId)
      const campusClassIds = campusClasses.map((c) => c.id)
      if (campusClassIds.length === 0) continue

      const currentSlotsRaw = await prisma.timetableSlot.findMany({
        where: {
          versionId: ver.id,
          classId: { in: campusClassIds },
          status: "ACTIVE",
        },
      })
      if (currentSlotsRaw.length === 0) continue

      const currentSlots: SlotRecord[] = currentSlotsRaw.map((s) => ({
        id: s.id,
        versionId: s.versionId || undefined,
        campusId: s.campusId || ver.campusId,
        academicYearId: s.academicYearId || academicYearId,
        semester: s.semester ?? ver.semester,
        level: s.level || "",
        grade: s.grade || "",
        classId: s.classId || "",
        className: s.className,
        dayOfWeek: s.dayOfWeek,
        session: s.session as "MORNING" | "AFTERNOON",
        periodNumber: s.periodNumber,
        subjectId: s.subjectId,
        subjectCode: s.subjectId ? subjectCodeById.get(s.subjectId) || null : null,
        subjectName: s.subjectName,
        teacherId: s.teacherId,
        teacherCode: s.teacherId ? teacherCodeById.get(s.teacherId) || null : null,
        teacherName: s.teacherName,
        coTeacherId: s.coTeacherId,
        coTeacherCode:
          s.coTeacherCode || (s.coTeacherId ? teacherCodeById.get(s.coTeacherId) || null : null),
        coTeacherName: s.coTeacherName,
        assistantTeacherId: s.assistantTeacherId,
        assistantTeacherCode: s.assistantTeacherCode,
        assistantTeacherName: s.assistantTeacherName,
        roomId: s.roomId,
        roomCode: s.roomCode,
        roomName: s.roomName,
        weekType: (s.weekType || "ALL") as "ALL" | "EVEN" | "ODD",
        altSubjectId: s.altSubjectId,
        altSubjectName: s.altSubjectName,
        altTeacherId: s.altTeacherId,
        altTeacherCode:
          s.altTeacherCode || (s.altTeacherId ? teacherCodeById.get(s.altTeacherId) || null : null),
        altTeacherName: s.altTeacherName,
        altRoomId: s.altRoomId,
        altRoomName: s.altRoomName,
        isLocked: s.isLocked,
        blockGroupId: s.blockGroupId,
        colorCode: s.colorCode,
        notes: s.notes,
      }))

      const rawById = new Map(currentSlotsRaw.map((s) => [s.id, s]))
      const campusIdSet = new Set(campusClassIds)

      const quotaItems = reconcileQuotasAndAssignments({
        classes: campusClasses,
        subjects,
        teachers,
        subjectQuotas: subjectQuotas as any,
        teachingAssignments: allTas.filter(
          (t) => t.semester === ver.semester && campusIdSet.has(t.classId)
        ) as any,
        ctqtAssignments: allCtqts.filter(
          (c) => c.semester === ver.semester && campusIdSet.has(c.classId)
        ) as any,
        specialAssignments: allSpecials.filter(
          (sp) => sp.semester === ver.semester && campusIdSet.has(sp.classId)
        ),
        scheduledSlots: currentSlots,
        cycleWeeks: 2,
      })

      const hydrated = hydrateSlotsFromAssignments({
        slots: currentSlots,
        quotaItems,
        subjects,
        mode: "FILL_MISSING",
      })

      if (hydrated.updatedCount === 0) continue

      await prisma.$transaction(async (tx) => {
        for (const s of hydrated.slots) {
          if (!s.id) continue
          const orig = rawById.get(s.id)
          if (!orig) continue
          const diff =
            orig.subjectId !== (s.subjectId || null) ||
            orig.teacherId !== (s.teacherId || null) ||
            orig.teacherName !== (s.teacherName || null) ||
            orig.coTeacherId !== (s.coTeacherId || null) ||
            orig.altSubjectId !== (s.altSubjectId || null) ||
            orig.altTeacherId !== (s.altTeacherId || null) ||
            orig.altTeacherName !== (s.altTeacherName || null)
          if (!diff) continue

          await tx.timetableSlot.update({
            where: { id: s.id },
            data: {
              subjectId: s.subjectId || orig.subjectId,
              teacherId: s.teacherId || null,
              teacherName: s.teacherName || null,
              coTeacherId: s.coTeacherId || null,
              coTeacherCode: s.coTeacherCode || null,
              coTeacherName: s.coTeacherName || null,
              altSubjectId: s.altSubjectId || null,
              altSubjectName: s.altSubjectName || null,
              altTeacherId: s.altTeacherId || null,
              altTeacherCode: s.altTeacherCode || null,
              altTeacherName: s.altTeacherName || null,
            },
          })
        }

        await tx.timetableVersion.update({
          where: { id: ver.id },
          data: {
            revision: { increment: 1 },
            updatedAt: new Date(),
          },
        })
      })

      totalUpdated += hydrated.updatedCount
      totalPrimary += hydrated.filledPrimaryCount
      totalAlt += hydrated.filledAltCount
    }

    revalidatePath('/admin/teaching-assignments')
    revalidatePath('/admin/thoi-khoa-bieu', 'layout')
    return {
      success: true as const,
      versionCount: draftVersions.length,
      updatedCount: totalUpdated,
      filledPrimaryCount: totalPrimary,
      filledAltCount: totalAlt,
    }
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi khi đồng bộ sang Thời khóa biểu." }
  }
}
