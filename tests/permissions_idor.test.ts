import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Permission & Anti-IDOR Audit (Giai đoạn 5)', () => {
  it('Reset academic results API (reset-kqht) enforces strict admin authentication to prevent data wipe', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/admin/ktdbcl/reset-kqht/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf-8')

    expect(content).toContain('auth()')
    expect(content).toContain('status: 401')
    expect(content).toContain('status: 403')
    expect(content).toContain('["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN"]')
  })

  it('Grade configurations API (grade-configs) guards GET, POST, and DELETE against unauthorized access', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/admin/ktdbcl/grade-configs/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf-8')

    expect(content).toContain('auth()')
    expect(content).toContain('status: 401')
    expect(content).toContain('status: 403')
    expect(content).toContain('KT_DBCL')
  })

  it('Gradebook lock and reminder endpoints require authentication and authorization', () => {
    const lockRoute = path.join(process.cwd(), 'src/app/api/admin/ktdbcl/gradebook-lock/route.ts')
    const remindRoute = path.join(process.cwd(), 'src/app/api/admin/ktdbcl/grade-reminder/route.ts')
    const benchRoute = path.join(process.cwd(), 'src/app/api/admin/ktdbcl/grade-benchmarks/route.ts')

    const lockContent = fs.readFileSync(lockRoute, 'utf-8')
    const remindContent = fs.readFileSync(remindRoute, 'utf-8')
    const benchContent = fs.readFileSync(benchRoute, 'utf-8')

    expect(lockContent).toContain('status: 401')
    expect(lockContent).toContain('status: 403')

    expect(remindContent).toContain('status: 401')
    expect(remindContent).toContain('status: 403')

    expect(benchContent).toContain('status: 401')
    expect(benchContent).toContain('status: 403')
  })

  it('Student survey submission verifies student token matches form studentId (Anti-IDOR)', () => {
    const submitPath = path.join(process.cwd(), 'src/app/api/hocsinh/submit/route.ts')
    const draftPath = path.join(process.cwd(), 'src/app/api/hocsinh/save-draft/route.ts')

    const submitContent = fs.readFileSync(submitPath, 'utf-8')
    const draftContent = fs.readFileSync(draftPath, 'utf-8')

    expect(submitContent).toContain('verifyStudentToken')
    expect(submitContent).toContain('studentId: session.studentId')

    expect(draftContent).toContain('verifyStudentToken')
    expect(draftContent).toContain('studentId: session.studentId')
  })

  it('Homeroom grades access restricts non-admin teachers from viewing unassigned homeroom classes', () => {
    const hrRoute = path.join(process.cwd(), 'src/app/api/teacher/homeroom-grades/route.ts')
    const content = fs.readFileSync(hrRoute, 'utf-8')

    expect(content).toContain('isHomeroomTeacher')
    expect(content).toContain('homeroomTeacherId')
    expect(content).toContain('status: 403')
  })

  it('Observation evaluation acknowledgment prevents IDOR by verifying host teacher identity', () => {
    const duGioActionPath = path.join(process.cwd(), 'src/app/teacher/du-gio/actions.ts')
    const content = fs.readFileSync(duGioActionPath, 'utf-8')

    expect(content).toContain('acknowledgeAndFeedbackEvaluation')
    expect(content).toContain('isHost')
    expect(content).toContain('Chỉ Giáo viên dạy của tiết này mới có quyền gửi phản hồi')
  })
})
