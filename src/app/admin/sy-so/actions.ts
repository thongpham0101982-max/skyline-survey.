"use server"
// @ts-nocheck
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getSnapshotsAction(academicYearId?: string, campusId: string = "ALL") {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      })
      targetYearId = activeYear?.id || ""
    }

    const snapshots = await prisma.monthlyEnrollmentSnapshot.findMany({
      where: {
        academicYearId: targetYearId,
        campusId: campusId || "ALL"
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    })

    return { success: true, snapshots }
  } catch (e: any) {
    console.error("getSnapshotsAction Error:", e)
    return { success: false, error: e.message }
  }
}

export async function getSnapshotDetailAction(snapshotId: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    const snapshot = await prisma.monthlyEnrollmentSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        classEnrollments: {
          orderBy: [
            { level: "asc" },
            { grade: "asc" },
            { className: "asc" }
          ]
        }
      }
    })

    if (!snapshot) return { success: false, error: "Không tìm thấy kỳ chốt sỹ số" }

    return { success: true, snapshot }
  } catch (e: any) {
    console.error("getSnapshotDetailAction Error:", e)
    return { success: false, error: e.message }
  }
}

export async function captureMonthlySnapshotAction({
  academicYearId,
  year,
  month,
  notes
}: {
  academicYearId: string
  year: number
  month: number
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }
    const userId = (session.user as any)?.id

    const activeYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    })
    if (!activeYear) return { success: false, error: "Không tìm thấy năm học" }

    const padMonth = String(month).padStart(2, "0")
    const periodLabel = `Tháng ${padMonth}/${year}`
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)

    const campuses = await prisma.campus.findMany({
      select: { id: true, campusCode: true, campusName: true }
    })

    const classes = await prisma.class.findMany({
      where: { academicYearId, status: "ACTIVE" },
      select: {
        id: true,
        className: true,
        grade: true,
        level: true,
        campusId: true,
        students: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            studentCode: true,
            studentTransfers: {
              where: { type: { in: ["IN", "OUT"] } },
              orderBy: { transferDate: "asc" }
            }
          }
        }
      }
    })

    const classRows: any[] = []
    let sysOpening = 0, sysInc = 0, sysDec = 0, sysClosing = 0
    let sysMN = 0, sysTH = 0, sysTHCS = 0, sysTHPT = 0

    const campusStats: Record<string, any> = {}
    for (const c of campuses) {
      campusStats[c.id] = {
        opening: 0, inc: 0, dec: 0, closing: 0,
        mn: 0, th: 0, thcs: 0, thpt: 0
      }
    }

    for (const cls of classes) {
      let clsOpening = 0
      let clsInc = 0
      let clsDec = 0
      let clsClosing = 0

      for (const s of cls.students) {
        const inTrans = s.studentTransfers.filter((t: any) => t.type === "IN")
        const outTrans = s.studentTransfers.filter((t: any) => t.type === "OUT")

        const inDate = inTrans.length > 0 ? new Date(inTrans[0].transferDate) : null
        const outDate = outTrans.length > 0 ? new Date(outTrans[0].transferDate) : null

        let activeAtEnd = true
        if (inDate && inDate > monthEnd) activeAtEnd = false
        if (outDate && outDate <= monthEnd) activeAtEnd = false

        let activeAtStart = true
        if (inDate && inDate >= monthStart) activeAtStart = false
        if (outDate && outDate < monthStart) activeAtStart = false

        if (activeAtEnd) clsClosing++
        if (activeAtStart) clsOpening++

        if (inDate && inDate >= monthStart && inDate <= monthEnd) clsInc++
        if (outDate && outDate >= monthStart && outDate <= monthEnd) clsDec++
      }

      if (clsOpening + clsInc - clsDec !== clsClosing) {
        clsOpening = clsClosing - clsInc + clsDec
      }

      classRows.push({
        classId: cls.id,
        className: cls.className,
        grade: cls.grade || "",
        level: cls.level || "",
        campusId: cls.campusId,
        openingCount: clsOpening,
        newStudents: clsInc,
        transferredIn: 0,
        transferredOut: clsDec,
        droppedOut: 0,
        reservedCount: 0,
        closingCount: clsClosing,
        maxCapacity: 30,
        occupancyRate: Number(((clsClosing / 30) * 100).toFixed(1))
      })

      sysOpening += clsOpening
      sysInc += clsInc
      sysDec += clsDec
      sysClosing += clsClosing

      if (cls.level === "Mầm non") sysMN += clsClosing
      else if (cls.level === "Tiểu học") sysTH += clsClosing
      else if (cls.level === "THCS") sysTHCS += clsClosing
      else sysTHPT += clsClosing

      if (campusStats[cls.campusId]) {
        const cs = campusStats[cls.campusId]
        cs.opening += clsOpening
        cs.inc += clsInc
        cs.dec += clsDec
        cs.closing += clsClosing
        if (cls.level === "Mầm non") cs.mn += clsClosing
        else if (cls.level === "Tiểu học") cs.th += clsClosing
        else if (cls.level === "THCS") cs.thcs += clsClosing
        else cs.thpt += clsClosing
      }
    }

    const sysRetention = sysOpening > 0 ? Number((((sysClosing - sysInc) / sysOpening) * 100).toFixed(2)) : 100

    // 1. Upsert ALL snapshot
    const allSnapshotId = `snp-${academicYearId}-ALL-${year}-${month}`
    const allSnapshot = await prisma.monthlyEnrollmentSnapshot.upsert({
      where: {
        uq_snapshot_comp: {
          academicYearId,
          campusId: "ALL",
          year,
          month
        }
      },
      update: {
        periodLabel,
        snapshotDate: monthEnd,
        status: "LOCKED",
        openingCount: sysOpening,
        increaseCount: sysInc,
        decreaseCount: sysDec,
        closingCount: sysClosing,
        preschoolCount: sysMN,
        primaryCount: sysTH,
        secondaryCount: sysTHCS,
        highSchoolCount: sysTHPT,
        retentionRate: sysRetention,
        notes: notes || `Chốt sỹ số ${periodLabel}`,
        lockedById: userId
      },
      create: {
        id: allSnapshotId,
        academicYearId,
        campusId: "ALL",
        year,
        month,
        periodLabel,
        snapshotDate: monthEnd,
        status: "LOCKED",
        openingCount: sysOpening,
        increaseCount: sysInc,
        decreaseCount: sysDec,
        closingCount: sysClosing,
        preschoolCount: sysMN,
        primaryCount: sysTH,
        secondaryCount: sysTHCS,
        highSchoolCount: sysTHPT,
        retentionRate: sysRetention,
        notes: notes || `Chốt sỹ số ${periodLabel}`,
        lockedById: userId
      }
    })

    // 2. Class detail entries
    for (const r of classRows) {
      await prisma.classMonthlyEnrollment.upsert({
        where: {
          uq_class_snapshot: {
            snapshotId: allSnapshot.id,
            classId: r.classId
          }
        },
        update: {
          className: r.className,
          grade: r.grade,
          level: r.level,
          campusId: r.campusId,
          openingCount: r.openingCount,
          newStudents: r.newStudents,
          transferredIn: r.transferredIn,
          transferredOut: r.transferredOut,
          droppedOut: r.droppedOut,
          reservedCount: r.reservedCount,
          closingCount: r.closingCount,
          maxCapacity: r.maxCapacity,
          occupancyRate: r.occupancyRate
        },
        create: {
          id: `cme-${allSnapshot.id}-${r.classId}`,
          snapshotId: allSnapshot.id,
          classId: r.classId,
          className: r.className,
          grade: r.grade,
          level: r.level,
          campusId: r.campusId,
          openingCount: r.openingCount,
          newStudents: r.newStudents,
          transferredIn: r.transferredIn,
          transferredOut: r.transferredOut,
          droppedOut: r.droppedOut,
          reservedCount: r.reservedCount,
          closingCount: r.closingCount,
          maxCapacity: r.maxCapacity,
          occupancyRate: r.occupancyRate
        }
      })
    }

    // 3. Campuses snapshots
    for (const c of campuses) {
      const cs = campusStats[c.id]
      const campRetention = cs.opening > 0 ? Number((((cs.closing - cs.inc) / cs.opening) * 100).toFixed(2)) : 100
      const campSnapshotId = `snp-${academicYearId}-${c.campusCode}-${year}-${month}`

      await prisma.monthlyEnrollmentSnapshot.upsert({
        where: {
          uq_snapshot_comp: {
            academicYearId,
            campusId: c.id,
            year,
            month
          }
        },
        update: {
          periodLabel,
          snapshotDate: monthEnd,
          status: "LOCKED",
          openingCount: cs.opening,
          increaseCount: cs.inc,
          decreaseCount: cs.dec,
          closingCount: cs.closing,
          preschoolCount: cs.mn,
          primaryCount: cs.th,
          secondaryCount: cs.thcs,
          highSchoolCount: cs.thpt,
          retentionRate: campRetention,
          notes: `Chốt sỹ số ${c.campusCode} ${periodLabel}`,
          lockedById: userId
        },
        create: {
          id: campSnapshotId,
          academicYearId,
          campusId: c.id,
          year,
          month,
          periodLabel,
          snapshotDate: monthEnd,
          status: "LOCKED",
          openingCount: cs.opening,
          increaseCount: cs.inc,
          decreaseCount: cs.dec,
          closingCount: cs.closing,
          preschoolCount: cs.mn,
          primaryCount: cs.th,
          secondaryCount: cs.thcs,
          highSchoolCount: cs.thpt,
          retentionRate: campRetention,
          notes: `Chốt sỹ số ${c.campusCode} ${periodLabel}`,
          lockedById: userId
        }
      })
    }

    revalidatePath("/admin")
    revalidatePath("/admin/sy-so")
    return { success: true, message: `Chốt sỹ số ${periodLabel} thành công!` }
  } catch (e: any) {
    console.error("captureMonthlySnapshotAction Error:", e)
    return { success: false, error: e.message }
  }
}
