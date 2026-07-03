"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/audit"

async function getDefaultCampusId() {
  const campus = await prisma.campus.findFirst()
  if (!campus) {
    const c = await prisma.campus.create({ data: { campusCode: "MAIN", campusName: "Campus Chinh", status: "ACTIVE" } })
    return c.id
  }
  return campus.id
}

/** Tim campusId theo name hoac id */
async function resolveCampusId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  const campus = await prisma.campus.findFirst({ where: { OR: [{ id: value }, { campusName: value }, { campusCode: value }] } })
  return campus?.id || null
}

/** Tim departmentId theo name (neu truyen string name) hoac lay chinh no neu la id */
async function resolveDepartmentId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  const dept = await prisma.department.findFirst({ where: { OR: [{ id: value }, { name: value }], status: "ACTIVE" } })
  return dept?.id || null
}

/** Tim subjectId theo subjectName hoac id */
async function resolveSubjectId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  const sub = await prisma.subject.findFirst({ where: { OR: [{ id: value }, { subjectName: value }], status: "ACTIVE" } })
  return sub?.id || null
}

/** Assign a Class as homeroom for a teacher (bidirectional sync) */
async function assignHomeroomClass(teacherId: string, classId: string | null) {
  if (classId) {
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`,
      teacherId
    )
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = ? WHERE id = ?`,
      teacherId, classId
    )
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { className: true } })
    const className = cls?.className || ""
    await prisma.$executeRawUnsafe(
      `UPDATE Teacher SET homeroomClass = ? WHERE id = ?`,
      className, teacherId
    )
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`,
      teacherId
    )
    await prisma.$executeRawUnsafe(
      `UPDATE Teacher SET homeroomClass = NULL WHERE id = ?`,
      teacherId
    )
  }
}

/** Dong bo UserCampusAssignment cho userId */
async function syncAdditionalCampuses(userId: string, additionalCampusIds: string[]) {
  // Delete all existing assignments for this user
  await prisma.userCampusAssignment.deleteMany({ where: { userId } });
  // Re-create with the new list (skip empty values and ensure uniqueness)
  const uniqueIds = Array.from(new Set(additionalCampusIds.filter(Boolean)));
  if (uniqueIds.length > 0) {
    await prisma.userCampusAssignment.createMany({
      data: uniqueIds.map(campusId => ({ userId, campusId }))
    });
  }
}

export async function createTeacherAction(data: any) {
  try {
    const teacherCode = data.teacherCode?.trim().toUpperCase()
    if (!teacherCode) {
      return { success: false, error: "Mã GV không được để trống!" }
    }

    // Check if Teacher already exists with this code
    const existing = await prisma.teacher.findUnique({ where: { teacherCode } })
    if (existing) {
      return { success: false, error: "Mã GV đã tồn tại: " + teacherCode }
    }

    // Check if the user email (which is teacherCode) is already associated with another Teacher
    const existingUser = await prisma.user.findUnique({ 
      where: { email: teacherCode },
      include: { teacher: true }
    })
    if (existingUser?.teacher) {
      return { success: false, error: `Tài khoản/Mã GV '${teacherCode}' đã được liên kết với một giáo viên khác!` }
    }

    const campusId = data.campusId || await getDefaultCampusId()
    const hashedPassword = await bcrypt.hash(teacherCode, 10)
    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const user = await prisma.user.create({
        data: { fullName: data.teacherName, email: teacherCode, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
      })
      userId = user.id
    }

    const departmentId = await resolveDepartmentId(data.department)
    const mainSubjectId = await resolveSubjectId(data.mainSubject)

    const teacher = await prisma.teacher.create({
      data: {
        userId, teacherCode, teacherName: data.teacherName,
        homeroomClass: null, email: data.email || null, phone: data.phone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        departmentId: departmentId,
        mainSubjectId: mainSubjectId,
        campusId, status: "ACTIVE", position: data.position || "GV"
      }
    })

    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "CREATE_TEACHER",
      "Teacher",
      teacher.id,
      null,
      { teacherCode, teacherName: data.teacherName, campusId }
    )

    if (data.homeroomClassId) {
      await assignHomeroomClass(teacher.id, data.homeroomClassId)
    }

    // Sync additional campuses (UserCampusAssignment)
    const additionalCampuses = Array.isArray(data.additionalCampusIds) ? data.additionalCampusIds : [];
    const allCampuses = Array.from(new Set([campusId, ...additionalCampuses])).filter(Boolean);
    await syncAdditionalCampuses(userId, allCampuses);

    revalidatePath("/admin/teachers")
    revalidatePath("/admin/classes")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTeacherAction(data: any) {
  try {
    const { id, teacherName, dateOfBirth, campusId } = data

    const updateData: any = {}
    if (teacherName) updateData.teacherName = teacherName
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (campusId !== undefined) updateData.campusId = campusId
    if (data.status !== undefined) updateData.status = data.status
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.position !== undefined) updateData.position = data.position

    if (data.department !== undefined) {
      updateData.departmentId = await resolveDepartmentId(data.department)
    }
    if (data.mainSubject !== undefined) {
      updateData.mainSubjectId = await resolveSubjectId(data.mainSubject)
    }

    const oldTeacher = await prisma.teacher.findUnique({ where: { id } })
    await prisma.teacher.update({ where: { id }, data: updateData })
    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "UPDATE_TEACHER",
      "Teacher",
      id,
      oldTeacher,
      updateData
    )

    if (teacherName || data.status !== undefined) {
      const teacher = await prisma.teacher.findUnique({ where: { id } })
      if (teacher) {
        const userUpdate: any = {}
        if (teacherName) userUpdate.fullName = teacherName
        if (data.status !== undefined) userUpdate.status = data.status
        await prisma.user.update({ where: { id: teacher.userId }, data: userUpdate }).catch(() => {})
      }
    }

    // Sync additional campuses (UserCampusAssignment)
    if (Array.isArray(data.additionalCampusIds)) {
      const teacher = await prisma.teacher.findUnique({ where: { id }, select: { userId: true, campusId: true } });
      if (teacher) {
        const finalCampusId = campusId !== undefined ? campusId : teacher.campusId;
        const allCampuses = Array.from(new Set([finalCampusId, ...data.additionalCampusIds])).filter(Boolean);
        await syncAdditionalCampuses(teacher.userId, allCampuses);
      }
    } else if (campusId !== undefined) {
      // Primary campus changed, but additional campuses was not sent/modified.
      // We should make sure the new primary campus is in UserCampusAssignment!
      const teacher = await prisma.teacher.findUnique({ 
        where: { id }, 
        select: { userId: true, campusId: true, user: { include: { campusAssignments: true } } } 
      });
      if (teacher) {
        const currentAdditional = teacher.user.campusAssignments
          .map(a => a.campusId)
          .filter(cid => cid !== teacher.campusId); // remove old primary
        const allCampuses = Array.from(new Set([campusId, ...currentAdditional])).filter(Boolean);
        await syncAdditionalCampuses(teacher.userId, allCampuses);
      }
    }

    revalidatePath("/admin/teachers")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTeacherAction(id: string) {
  try {
    await prisma.$executeRawUnsafe(`UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`, id)
    const teacher = await prisma.teacher.findUnique({ where: { id } })
    if (!teacher) return { success: false, error: "Không tìm thấy giáo viên" }
    await prisma.teacher.delete({ where: { id } })
    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "DELETE_TEACHER",
      "Teacher",
      id,
      teacher,
      null
    )
    await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {})
    revalidatePath("/admin/teachers")
    revalidatePath("/admin/classes")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function importTeachersAction(rows: any[], academicYearId?: string) {
  const defaultCampusId = await getDefaultCampusId()
  let created = 0, skipped = 0
  const errors: string[] = []
  const warnings: string[] = []
  const seenCodesInFile = new Set()

  // 1. Pre-fetch lookups to avoid O(N) database queries inside the loop
  const [campuses, departments, subjects] = await Promise.all([
    prisma.campus.findMany(),
    prisma.department.findMany({ where: { status: "ACTIVE" } }),
    prisma.subject.findMany({ where: { status: "ACTIVE" } })
  ])

  // Helper Maps for O(1) in-memory lookups
  const campusMap = new Map()
  campuses.forEach(c => {
    campusMap.set(c.id, c.id)
    campusMap.set(c.campusName, c.id)
    campusMap.set(c.campusCode, c.id)
  })

  const deptMap = new Map()
  departments.forEach(d => {
    deptMap.set(d.id, d.id)
    deptMap.set(d.name, d.id)
  })

  const subMap = new Map()
  subjects.forEach(s => {
    subMap.set(s.id, s.id)
    subMap.set(s.subjectName, s.id)
  })

  // 2. Pre-hash all teacherCodes in parallel to yield the single-threaded CPU loop periodically
  const hashedPasswordsMap = new Map()
  await Promise.all(
    rows.map(async (row) => {
      if (row.teacherCode) {
        const code = String(row.teacherCode).trim().toUpperCase()
        const hash = await bcrypt.hash(code, 10)
        hashedPasswordsMap.set(code, hash)
      }
    })
  )

  // 3. Process database updates sequentially
  for (const row of rows) {
    if (!row.teacherCode || !row.teacherName) { skipped++; continue }
    const code = String(row.teacherCode).trim().toUpperCase()
    if (seenCodesInFile.has(code)) {
      skipped++
      warnings.push(`Mã GV trùng lặp trong tệp Excel: ${code}`)
      continue
    }
    seenCodesInFile.add(code)

    try {
      const existing = await prisma.teacher.findUnique({ where: { teacherCode: code } })
      if (existing) {
        skipped++
        warnings.push(`Mã GV đã tồn tại trong hệ thống: ${code}`)
        continue
      }

      const hashedPassword = hashedPasswordsMap.get(code) || await bcrypt.hash(code, 10)
      const existingUser = await prisma.user.findUnique({ where: { email: code } })
      let userId: string
      if (existingUser) {
        userId = existingUser.id
      } else {
        const user = await prisma.user.create({
          data: { fullName: row.teacherName, email: code, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
        })
        userId = user.id
      }

      const departmentId = row.department ? (deptMap.get(row.department) || null) : null
      const mainSubjectId = row.mainSubject ? (subMap.get(row.mainSubject) || null) : null
      
      let campusId = defaultCampusId;
      let additionalCampusIds = [];

      if (row.campus) {
        const campusParts = typeof row.campus === "string"
          ? row.campus.split(/[,;|]/).map(s => s.trim())
          : [row.campus];
        
        const primaryResolved = campusMap.get(campusParts[0]);
        if (primaryResolved) campusId = primaryResolved;

        for (let i = 1; i < campusParts.length; i++) {
          const cid = campusMap.get(campusParts[i]);
          if (cid) additionalCampusIds.push(cid);
        }
      }

      const teacher = await prisma.teacher.create({
        data: {
          userId, teacherCode: code, teacherName: row.teacherName,
          email: row.email || null, phone: row.phone || null,
          departmentId, mainSubjectId,
          campusId, status: "ACTIVE"
        }
      })

      // Sync additional campuses (UserCampusAssignment)
      const allCampuses = Array.from(new Set([campusId, ...additionalCampusIds])).filter(Boolean);
      await syncAdditionalCampuses(userId, allCampuses);

      if (row.homeroomClass) {
        const matchedClass = await prisma.class.findFirst({
          where: { className: { equals: row.homeroomClass } }
        })
        if (matchedClass) {
          await assignHomeroomClass(teacher.id, matchedClass.id)
        } else {
          await prisma.$executeRawUnsafe(`UPDATE Teacher SET homeroomClass = ? WHERE id = ?`, row.homeroomClass, teacher.id)
        }
      }
      created++
    } catch(e: any) {
      errors.push(code + ": " + e.message)
    }
  }

  const session = await auth()
  await logActivity(
    session?.user?.id || "SYSTEM",
    session?.user?.email || "SYSTEM",
    "IMPORT_TEACHERS",
    "Teacher",
    "BATCH",
    null,
    { created, skipped, errorsCount: errors.length }
  )
  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true, created, skipped, errors, warnings }
}

export async function resetTeacherPasswordAction(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return { success: false }
  const hashedPassword = await bcrypt.hash(teacher.teacherCode, 10)
  await prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash: hashedPassword } })
  return { success: true }
}
export async function assignTeachersToRoleAction(teacherIds: string[], roleCode: string) {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, userId: true, teacherCode: true, teacherName: true, campusId: true }
    });

    const defaultCampus = await prisma.campus.findFirst();
    const defaultCampusId = defaultCampus?.id;

    for (const t of teachers) {
      if (t.userId) {
        // Update existing user role
        await prisma.user.update({
          where: { id: t.userId },
          data: { role: roleCode }
        });
      } else {
        // Create user record if missing (safeguard)
        const hashedPassword = await bcrypt.hash(t.teacherCode, 10);
        const newUser = await prisma.user.create({
          data: {
            fullName: t.teacherName,
            email: t.teacherCode,
            passwordHash: hashedPassword,
            role: roleCode,
            status: "ACTIVE"
          }
        });
        await prisma.teacher.update({
          where: { id: t.id },
          data: { userId: newUser.id }
        });
        
        // Also assign primary campus
        const campusId = t.campusId || defaultCampusId;
        if (campusId) {
          await prisma.userCampusAssignment.create({
            data: { userId: newUser.id, campusId }
          }).catch(() => {});
        }
      }
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
