import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Backend Architecture & Security Audit (Giai đoạn 3)', () => {
  it('Next.js 16 edge proxy file src/proxy.ts must exist without conflicting middleware.ts', () => {
    const proxyPath = path.join(process.cwd(), 'src', 'proxy.ts')
    const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts')
    expect(fs.existsSync(proxyPath)).toBe(true)
    expect(fs.existsSync(middlewarePath)).toBe(false)
  })

  it('init-db-tables endpoint must be decommissioned (no raw DDL or hardcoded token)', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/admin/init-db-tables/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf-8')
    expect(content).not.toContain('CREATE TABLE IF NOT EXISTS')
    expect(content).not.toContain('DEFAULT_FALLBACK_TOKEN')
    expect(content).toContain('decommissioned')
  })

  it('Database connection in src/lib/db/index.ts must not contain hardcoded fallback auth token', () => {
    const dbPath = path.join(process.cwd(), 'src/lib/db/index.ts')
    const content = fs.readFileSync(dbPath, 'utf-8')
    expect(content).not.toContain('DEFAULT_FALLBACK_TOKEN')
    expect(content).not.toContain('eyJhbGciOiJFZERTQS')
  })

  it('Cron routes must reject unauthorized requests when CRON_SECRET is configured', () => {
    const cron1 = path.join(process.cwd(), 'src/app/api/cron/remind-observation-slots/route.ts')
    const cron2 = path.join(process.cwd(), 'src/app/api/cron/send-monthly-ttcm-report/route.ts')
    const content1 = fs.readFileSync(cron1, 'utf-8')
    const content2 = fs.readFileSync(cron2, 'utf-8')
    
    expect(content1).toContain('status: 401')
    expect(content2).toContain('status: 401')
  })

  it('Teacher assessments route must not query invalid field isCurrent on AcademicYear', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/teacher-assessments/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    expect(content).not.toContain('isCurrent: true')
    expect(content).toContain('status: "ACTIVE"')
  })

  it('Parent survey action must check parent-student link to prevent IDOR', () => {
    const actionPath = path.join(process.cwd(), 'src/app/parent/surveys/[id]/actions.ts')
    const content = fs.readFileSync(actionPath, 'utf-8')
    expect(content).toContain('parentStudentLink.findFirst')
  })

  it('Student login supports studentCode as password when configured for convenience', () => {
    const loginPath = path.join(process.cwd(), 'src/app/api/hocsinh/login/route.ts')
    const content = fs.readFileSync(loginPath, 'utf-8')
    expect(content).toContain('rawPassword === code')
  })

  it('Class deletion must verify no active students exist before deleting', () => {
    const classesActionPath = path.join(process.cwd(), 'src/app/admin/classes/actions.ts')
    const content = fs.readFileSync(classesActionPath, 'utf-8')
    expect(content).toContain('Không thể xóa: Có')
  })
})
