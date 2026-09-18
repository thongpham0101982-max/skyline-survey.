import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Frontend, UI/UX & Responsive Audit (Giai đoạn 7)', () => {
  describe('Loading States & Skeleton Boundaries (loading.tsx)', () => {
    it('Ensures all major portal routes have dedicated loading skeletons', () => {
      const rootLoading = path.join(process.cwd(), 'src/app/loading.tsx')
      const adminLoading = path.join(process.cwd(), 'src/app/admin/loading.tsx')
      const teacherLoading = path.join(process.cwd(), 'src/app/teacher/loading.tsx')
      const parentLoading = path.join(process.cwd(), 'src/app/parent/loading.tsx')
      const studentLoading = path.join(process.cwd(), 'src/app/hocsinh/portal/loading.tsx')
      const surveyLoading = path.join(process.cwd(), 'src/app/hocsinh/hs-khaosat/loading.tsx')

      expect(fs.existsSync(rootLoading)).toBe(true)
      expect(fs.existsSync(adminLoading)).toBe(true)
      expect(fs.existsSync(teacherLoading)).toBe(true)
      expect(fs.existsSync(parentLoading)).toBe(true)
      expect(fs.existsSync(studentLoading)).toBe(true)
      expect(fs.existsSync(surveyLoading)).toBe(true)

      expect(fs.readFileSync(adminLoading, 'utf-8')).toContain('animate-pulse')
      expect(fs.readFileSync(teacherLoading, 'utf-8')).toContain('animate-pulse')
    })
  })

  describe('Error Boundaries & Graceful Recovery (error.tsx)', () => {
    it('Ensures all critical user spaces have recoverable error boundaries with retry mechanism', () => {
      const rootError = path.join(process.cwd(), 'src/app/error.tsx')
      const adminError = path.join(process.cwd(), 'src/app/admin/error.tsx')
      const teacherError = path.join(process.cwd(), 'src/app/teacher/error.tsx')
      const parentError = path.join(process.cwd(), 'src/app/parent/error.tsx')
      const studentError = path.join(process.cwd(), 'src/app/hocsinh/portal/error.tsx')

      expect(fs.existsSync(rootError)).toBe(true)
      expect(fs.existsSync(adminError)).toBe(true)
      expect(fs.existsSync(teacherError)).toBe(true)
      expect(fs.existsSync(parentError)).toBe(true)
      expect(fs.existsSync(studentError)).toBe(true)

      expect(fs.readFileSync(adminError, 'utf-8')).toContain('reset()')
      expect(fs.readFileSync(adminError, 'utf-8')).toContain('Thử tải lại')
      expect(fs.readFileSync(teacherError, 'utf-8')).toContain('reset()')
      expect(fs.readFileSync(parentError, 'utf-8')).toContain('reset()')
      expect(fs.readFileSync(studentError, 'utf-8')).toContain('reset()')
    })
  })

  describe('Empty State Component Standard', () => {
    it('Provides standardized EmptyState UI component with icon and action support', () => {
      const emptyStatePath = path.join(process.cwd(), 'src/components/ui/EmptyState.tsx')
      expect(fs.existsSync(emptyStatePath)).toBe(true)
      const content = fs.readFileSync(emptyStatePath, 'utf-8')

      expect(content).toContain('export function EmptyState')
      expect(content).toContain('title')
      expect(content).toContain('description')
      expect(content).toContain('action')
    })
  })

  describe('Responsive Layout Containers & Mobile Navigation', () => {
    it('Admin, Teacher, and Parent layouts support horizontal scrolling for wide tables without content clipping', () => {
      const adminLayout = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf-8')
      const teacherLayout = fs.readFileSync(path.join(process.cwd(), 'src/app/teacher/layout.tsx'), 'utf-8')
      const parentLayout = fs.readFileSync(path.join(process.cwd(), 'src/app/parent/layout.tsx'), 'utf-8')

      expect(adminLayout).toContain('overflow-x-auto')
      expect(teacherLayout).toContain('overflow-x-auto')
      expect(parentLayout).toContain('overflow-x-auto')

      expect(adminLayout).toContain('AdminMobileBottomNav')
      expect(teacherLayout).toContain('TeacherMobileBottomNav')
      expect(parentLayout).toContain('ParentMobileBottomNav')
    })
  })
})
