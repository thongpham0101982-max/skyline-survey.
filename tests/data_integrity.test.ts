import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import dotenv from 'dotenv'

dotenv.config()

describe('Data Integrity & Scope Verification (Giai đoạn 2)', () => {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim()
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim()
  const libsql = createClient({
    url: tursoUrl.replace(/^libsql:\/\//, 'https://'),
    authToken: tursoToken,
  })
  const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) })

  it('No orphan survey forms should exist without a valid surveyPeriod', async () => {
    const validPeriodIds = new Set((await prisma.surveyPeriod.findMany({ select: { id: true } })).map(p => p.id))
    const allForms = await prisma.surveyForm.findMany({ select: { id: true, surveyPeriodId: true } })
    const orphans = allForms.filter(f => !validPeriodIds.has(f.surveyPeriodId))
    expect(orphans.length).toBe(0)
  })

  it('The 88 students preserved in original state should match exactly 88 year mismatches', async () => {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        academicYearId: true,
        class: { select: { academicYearId: true } }
      }
    })
    const mismatches = students.filter(s => s.class && s.academicYearId !== s.class.academicYearId)
    expect(mismatches.length).toBe(88)
  })

  it('Admin user account typo admin@sklineschool should be resolved', async () => {
    const typoUser = await prisma.user.findFirst({
      where: { email: 'admin@sklineschool' }
    })
    expect(typoUser).toBeNull()

    const correctUser = await prisma.user.findFirst({
      where: { email: 'admin@skylineschool.edu.vn' }
    })
    expect(correctUser).toBeDefined()
  })
})
