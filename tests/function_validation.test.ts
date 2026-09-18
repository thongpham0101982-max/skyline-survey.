import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

describe('Function & Form Validation Audit (Giai đoạn 6)', () => {
  describe('User Management Validation (src/app/admin/users/actions.ts)', () => {
    it('Enforces Zod validation for user creation and update with minimum password length', () => {
      const usersActionPath = path.join(process.cwd(), 'src/app/admin/users/actions.ts')
      expect(fs.existsSync(usersActionPath)).toBe(true)
      const content = fs.readFileSync(usersActionPath, 'utf-8')

      expect(content).toContain('CreateUserSchema')
      expect(content).toContain('UpdateUserSchema')
      expect(content).toContain('Mật khẩu khởi tạo phải có ít nhất 6 ký tự')
      expect(content).toContain('Mã NV / Tên đăng nhập phải có ít nhất 2 ký tự')
    })
  })

  describe('Department Mutations & Zod Validation (src/app/api/departments/route.ts)', () => {
    it('Guards POST, PUT, DELETE with admin session and enforces DepartmentInputSchema', () => {
      const deptRoutePath = path.join(process.cwd(), 'src/app/api/departments/route.ts')
      expect(fs.existsSync(deptRoutePath)).toBe(true)
      const content = fs.readFileSync(deptRoutePath, 'utf-8')

      expect(content).toContain('checkDeptPermission')
      expect(content).toContain('DepartmentInputSchema')
      expect(content).toContain('Mã Tổ phải có ít nhất 2 ký tự')
      expect(content).toContain('Tên Tổ phải có ít nhất 2 ký tự')
      expect(content).toContain('status: 401')
      expect(content).toContain('status: 403')
    })
  })

  describe('Student Survey Mandatory Questions Validation (src/app/api/hocsinh/submit/route.ts)', () => {
    it('Validates all active isRequired questions before committing submission', () => {
      const submitRoutePath = path.join(process.cwd(), 'src/app/api/hocsinh/submit/route.ts')
      expect(fs.existsSync(submitRoutePath)).toBe(true)
      const content = fs.readFileSync(submitRoutePath, 'utf-8')

      expect(content).toContain('q.isRequired')
      expect(content).toContain('Câu hỏi')
      expect(content).toContain('là bắt buộc, vui lòng trả lời đầy đủ trước khi nộp bài')
      expect(content).toContain('status: 400')
    })
  })

  describe('Parent Survey Mandatory Questions Validation (src/app/parent/surveys/[id]/actions.ts)', () => {
    it('Checks all active isRequired survey questions before committing parent submission', () => {
      const parentSurveyActionPath = path.join(process.cwd(), 'src/app/parent/surveys/[id]/actions.ts')
      expect(fs.existsSync(parentSurveyActionPath)).toBe(true)
      const content = fs.readFileSync(parentSurveyActionPath, 'utf-8')

      expect(content).toContain('periodQuestions')
      expect(content).toContain('isRequired: true')
      expect(content).toContain('Vui lòng hoàn thành câu hỏi bắt buộc')
    })
  })

  describe('Campus Actions Authentication & Validation (src/app/admin/campuses/actions.ts)', () => {
    it('Requires admin auth and enforces minimum length for code and name', () => {
      const campusActionsPath = path.join(process.cwd(), 'src/app/admin/campuses/actions.ts')
      expect(fs.existsSync(campusActionsPath)).toBe(true)
      const content = fs.readFileSync(campusActionsPath, 'utf-8')

      expect(content).toContain('checkAdminAuth')
      expect(content).toContain('CampusInputSchema')
      expect(content).toContain('Mã cơ sở phải có ít nhất 2 ký tự')
      expect(content).toContain('Tên cơ sở phải có ít nhất 2 ký tự')
    })
  })

  describe('Class Actions Validation & Anti-Duplicate (src/app/admin/classes/actions.ts)', () => {
    it('Validates className length and prevents duplicate class names in same year and campus', () => {
      const classActionsPath = path.join(process.cwd(), 'src/app/admin/classes/actions.ts')
      expect(fs.existsSync(classActionsPath)).toBe(true)
      const content = fs.readFileSync(classActionsPath, 'utf-8')

      expect(content).toContain('Tên lớp không được để trống và phải có ít nhất 2 ký tự')
      expect(content).toContain('Vui lòng chọn năm học cho lớp')
      expect(content).toContain('Vui lòng chọn cơ sở cho lớp')
      expect(content).toContain('đã tồn tại trong cùng năm học và cơ sở')
    })
  })

  describe('Teacher Actions Validation (src/app/admin/teachers/actions.ts)', () => {
    it('Validates teacherName length in create and update actions', () => {
      const teacherActionsPath = path.join(process.cwd(), 'src/app/admin/teachers/actions.ts')
      expect(fs.existsSync(teacherActionsPath)).toBe(true)
      const content = fs.readFileSync(teacherActionsPath, 'utf-8')

      expect(content).toContain('Họ và tên giáo viên không được để trống và phải có ít nhất 2 ký tự')
      expect(content).toContain('Họ và tên giáo viên phải có ít nhất 2 ký tự')
    })
  })

  describe('Parent Account Security & Reset Validation (src/app/admin/parents/actions.ts)', () => {
    it('Requires admin auth and enforces min 6 chars for password reset', () => {
      const parentActionsPath = path.join(process.cwd(), 'src/app/admin/parents/actions.ts')
      expect(fs.existsSync(parentActionsPath)).toBe(true)
      const content = fs.readFileSync(parentActionsPath, 'utf-8')

      expect(content).toContain('checkParentAdminAuth')
      expect(content).toContain('Mật khẩu khôi phục phải có ít nhất 6 ký tự')
    })
  })

  describe('Survey Period Safety & Validation (src/app/admin/surveys/actions.ts)', () => {
    it('Prevents deletion of survey periods with submitted responses and validates inputs', () => {
      const surveyActionsPath = path.join(process.cwd(), 'src/app/admin/surveys/actions.ts')
      expect(fs.existsSync(surveyActionsPath)).toBe(true)
      const content = fs.readFileSync(surveyActionsPath, 'utf-8')

      expect(content).toContain('checkSurveyAdminAuth')
      expect(content).toContain('Tên đợt khảo sát phải có ít nhất 3 ký tự')
      expect(content).toContain('Không thể xóa đợt khảo sát đã có')
      expect(content).toContain('phiếu khảo sát đã nộp kết quả')
    })
  })
})
