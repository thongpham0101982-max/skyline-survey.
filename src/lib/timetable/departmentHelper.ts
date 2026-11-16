export interface DepartmentItem {
  id: string
  code?: string
  name: string
  blockCM?: string
  teacherCount?: number
}

export interface DepartmentAwareTeacher {
  id: string
  teacherCode?: string | null
  teacherName: string
  campusId?: string | null
  departmentId?: string | null
  departmentName?: string | null
  departmentIds?: string[] | null
  allDepartmentNames?: string | null
  mainSubjectId?: string | null
}

export const UNASSIGNED_DEPT_VALUE = "__UNASSIGNED__"

export function teacherMatchesDepartment(
  teacher: DepartmentAwareTeacher,
  selectedDepartmentId: string
): boolean {
  if (!selectedDepartmentId || selectedDepartmentId === "ALL") return true
  const ids = Array.isArray(teacher.departmentIds)
    ? teacher.departmentIds.filter(Boolean)
    : teacher.departmentId
    ? [teacher.departmentId]
    : []

  if (selectedDepartmentId === UNASSIGNED_DEPT_VALUE) {
    return ids.length === 0 && !teacher.departmentName
  }
  return ids.includes(selectedDepartmentId) || teacher.departmentId === selectedDepartmentId
}

export function groupTeachersByDepartment<T extends DepartmentAwareTeacher>(
  teachers: T[],
  prioritySubjectId?: string | null
): Array<{ key: string; label: string; teachers: T[] }> {
  const groups: Array<{ key: string; label: string; teachers: T[] }> = []
  const usedInPriority = new Set<string>()

  if (prioritySubjectId) {
    const matchedSubjectTeachers = teachers.filter(
      (t) => t.mainSubjectId && t.mainSubjectId === prioritySubjectId
    )
    if (matchedSubjectTeachers.length > 0) {
      groups.push({
        key: "__PRIORITY_SUBJECT__",
        label: "Đúng môn chuyên môn",
        teachers: matchedSubjectTeachers,
      })
      for (const t of matchedSubjectTeachers) usedInPriority.add(t.id)
    }
  }

  const byDept = new Map<string, T[]>()
  const unassigned: T[] = []

  for (const t of teachers) {
    if (usedInPriority.has(t.id)) continue
    const deptLabel = (t.departmentName || "").trim()
    if (!deptLabel) {
      unassigned.push(t)
    } else {
      const arr = byDept.get(deptLabel) || []
      arr.push(t)
      byDept.set(deptLabel, arr)
    }
  }

  const sortedDeptNames = Array.from(byDept.keys()).sort((a, b) => a.localeCompare(b, "vi"))
  for (const name of sortedDeptNames) {
    const list = byDept.get(name)!
    groups.push({
      key: `dept:${name}`,
      label: name,
      teachers: list,
    })
  }

  if (unassigned.length > 0) {
    groups.push({
      key: UNASSIGNED_DEPT_VALUE,
      label: "Chưa phân Tổ chuyên môn",
      teachers: unassigned,
    })
  }

  return groups
}
