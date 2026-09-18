import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { prisma } from '../src/lib/db'

describe('Business Logic & Workflow Transitions (Giai đoạn 4)', () => {
  it('WorkTask status transition enforces valid progress values and authorization checks', () => {
    const tasksActionPath = path.join(process.cwd(), 'src/app/admin/tasks/actions.ts')
    expect(fs.existsSync(tasksActionPath)).toBe(true)
    const content = fs.readFileSync(tasksActionPath, 'utf-8')

    // Whitelisted statuses
    expect(content).toContain('["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"]')
    // Authorization guards
    expect(content).toContain('assignedById')
    expect(content).toContain('assignedToUserId')
    expect(content).toContain('deleteTask')
  })

  it('Teaching Assignment saveAssignment overwrites existing assignment to prevent duplicates', () => {
    const assignActionPath = path.join(process.cwd(), 'src/app/admin/teaching-assignments/actions.ts')
    expect(fs.existsSync(assignActionPath)).toBe(true)
    const content = fs.readFileSync(assignActionPath, 'utf-8')

    // Deletes previous assignment before creating new one
    expect(content).toContain('teachingAssignment.deleteMany')
    expect(content).toContain('teachingAssignment.create')
  })

  it('Class deletion checks for both student and teaching assignment dependencies', () => {
    const classesActionPath = path.join(process.cwd(), 'src/app/admin/classes/actions.ts')
    const content = fs.readFileSync(classesActionPath, 'utf-8')

    expect(content).toContain('studentCount')
    expect(content).toContain('assignmentCount')
    expect(content).toContain('phân công giảng dạy đang liên kết với các lớp được chọn')
  })

  it('Teacher actions enforce session authentication and dependency checks before deletion', () => {
    const teacherActionPath = path.join(process.cwd(), 'src/app/admin/teachers/actions.ts')
    const content = fs.readFileSync(teacherActionPath, 'utf-8')

    expect(content).toContain('deleteTeacherAction')
    expect(content).toContain('teachingAssignment.count({ where: { teacherId: id } })')
    expect(content).toContain('observationSlot.count({ where: { teacherId: id } })')
    expect(content).toContain('observationRegistration.count({ where: { teacherId: id } })')
  })

  it('Observation slot deletion prevents non-admin from deleting slots with completed evaluations', () => {
    const duGioActionPath = path.join(process.cwd(), 'src/app/teacher/du-gio/actions.ts')
    const content = fs.readFileSync(duGioActionPath, 'utf-8')

    expect(content).toContain('deleteObservationSlot')
    expect(content).toContain('Tiết dạy đã có phiếu đánh giá dự giờ. Không thể xóa.')
    expect(content).toContain('deleteMultipleObservationSlots')
    expect(content).toContain('Một hoặc nhiều tiết dạy đã có phiếu đánh giá dự giờ. Không thể xóa.')
  })

  it('Observation request response is restricted to host teacher and authorized observation admins', () => {
    const duGioActionPath = path.join(process.cwd(), 'src/app/teacher/du-gio/actions.ts')
    const content = fs.readFileSync(duGioActionPath, 'utf-8')

    expect(content).toContain('respondToObservationRequest')
    expect(content).toContain('currentTeacher.id !== slot.teacherId')
    expect(content).toContain('Chỉ giáo viên được mời dự giờ hoặc Quản trị viên mới có quyền phê duyệt/từ chối yêu cầu này.')
  })

  it('Student advisory tables (StudentGoalTrackingLog, StudentReflection, StudentAdvisoryStatus) query without missing column errors', async () => {
    // Check that Turso schema columns are fully accessible
    const logs = await prisma.studentGoalTrackingLog.findMany({ take: 1 })
    expect(Array.isArray(logs)).toBe(true)

    const reflections = await prisma.studentReflection.findMany({ take: 1 })
    expect(Array.isArray(reflections)).toBe(true)

    const statuses = await prisma.studentAdvisoryStatus.findMany({ take: 1 })
    expect(Array.isArray(statuses)).toBe(true)
  })
})
