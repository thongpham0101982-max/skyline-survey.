import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

describe('Database Schema & Integrity Audit (Giai đoạn 1)', () => {
  it('Prisma Client should contain all core school management models', () => {
    const models = Prisma.dmmf.datamodel.models.map(m => m.name)
    expect(models).toContain('User')
    expect(models).toContain('Teacher')
    expect(models).toContain('Parent')
    expect(models).toContain('Campus')
    expect(models).toContain('AcademicYear')
    expect(models).toContain('Class')
    expect(models).toContain('Student')
    expect(models).toContain('SurveyPeriod')
    expect(models).toContain('SurveyForm')
    expect(models).toContain('SurveyResponse')
    expect(models).toContain('SummaryByClass')
    expect(models).toContain('SummaryByCampus')
    expect(models).toContain('SummarySystem')
  })

  it('SurveyForm relation to SurveyPeriod must have onDelete Cascade', () => {
    const surveyFormModel = Prisma.dmmf.datamodel.models.find(m => m.name === 'SurveyForm')
    expect(surveyFormModel).toBeDefined()
    const periodField = surveyFormModel?.fields.find(f => f.name === 'surveyPeriod')
    expect(periodField).toBeDefined()
    expect(periodField?.relationOnDelete).toBe('Cascade')
  })

  it('Summary models relations to SurveyPeriod must have onDelete Cascade', () => {
    const summaryByClass = Prisma.dmmf.datamodel.models.find(m => m.name === 'SummaryByClass')
    const summaryByCampus = Prisma.dmmf.datamodel.models.find(m => m.name === 'SummaryByCampus')
    const summarySystem = Prisma.dmmf.datamodel.models.find(m => m.name === 'SummarySystem')

    expect(summaryByClass?.fields.find(f => f.name === 'surveyPeriod')?.relationOnDelete).toBe('Cascade')
    expect(summaryByCampus?.fields.find(f => f.name === 'surveyPeriod')?.relationOnDelete).toBe('Cascade')
    expect(summarySystem?.fields.find(f => f.name === 'surveyPeriod')?.relationOnDelete).toBe('Cascade')
  })
})
