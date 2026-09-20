import { describe, it, expect } from 'vitest'
import { calculateSubjectGap, evaluateNonSubjectGoalProgress } from '../src/lib/advisory/advisoryGapService'

/**
 * SSM Monthly Improvement Batch #01 - Regression Test Suite
 * Item: IMP-003 (Score Calculation & GAP Consistency Verification)
 * Standard: STABLE BY DEFAULT - CHANGE BY EVIDENCE
 */
describe('Batch #01: IMP-003 Score Calculation & GAP Consistency', () => {
  describe('calculateSubjectGap', () => {
    it('calculates achieved/surpassed goal when latest score >= target', () => {
      const result = calculateSubjectGap(8.0, { KSCL: 6.5, GK1: 8.5 }, 'MAT', 'Toán học')
      expect(result.currentScore).toBe(8.5)
      expect(result.gap).toBeCloseTo(-0.5)
      expect(result.status).toBe('DAT_VUOT_MUC_TIEU')
      expect(result.statusColor).toBe('status-success')
      expect(result.statusLabel).toContain('Vượt mục tiêu')
    })

    it('calculates approaching goal (TIEM_CAN) when gap is within 0.5', () => {
      const result = calculateSubjectGap(8.0, { KSCL: 7.0, GK1: 7.6 }, 'MAT', 'Toán học')
      expect(result.currentScore).toBe(7.6)
      expect(result.gap).toBeCloseTo(0.4)
      expect(result.status).toBe('TIEM_CAN')
      expect(result.statusColor).toBe('status-warning')
      expect(result.statusLabel).toContain('Tiệm cận')
    })

    it('calculates effort needed (CAN_NO_LUC) when gap exceeds 0.5', () => {
      const result = calculateSubjectGap(8.0, { KSCL: 5.5, GK1: 6.5 }, 'MAT', 'Toán học')
      expect(result.currentScore).toBe(6.5)
      expect(result.gap).toBeCloseTo(1.5)
      expect(result.status).toBe('CAN_NO_LUC')
      expect(result.statusColor).toBe('status-info')
    })

    it('handles empty/null score periods correctly without NaN', () => {
      const result = calculateSubjectGap(8.0, {}, 'MAT', 'Toán học')
      expect(result.currentScore).toBeNull()
      expect(result.gap).toBeNull()
      expect(result.status).toBe('CHUA_CO_DIEM')
      expect(result.statusColor).toBe('status-neutral')
    })

    it('builds coherent trend text across consecutive examination terms', () => {
      const result = calculateSubjectGap(8.5, { KSCL: 6.0, GK1: 7.0, CK1: 7.5 }, 'ENG', 'Tiếng Anh')
      expect(result.trend.length).toBe(3)
      expect(result.trendText).toBe('KSCL: 6.0 → GK1: 7.0 → CK1: 7.5 → Mục tiêu: 8.5')
    })
  })

  describe('evaluateNonSubjectGoalProgress', () => {
    it('evaluates DAT status accurately at 100% progress', () => {
      const res = evaluateNonSubjectGoalProgress('DAT')
      expect(res.status).toBe('DAT')
      expect(res.percent).toBe(100)
    })

    it('evaluates IN_PROGRESS status accurately at 60% progress', () => {
      const res = evaluateNonSubjectGoalProgress('IN_PROGRESS')
      expect(res.status).toBe('DANG_THUC_HIEN')
      expect(res.percent).toBe(60)
    })

    it('evaluates adjustment needed status accurately at 30% progress', () => {
      const res = evaluateNonSubjectGoalProgress('CAN_DIEU_CHINH')
      expect(res.status).toBe('CAN_DIEU_CHINH')
      expect(res.percent).toBe(30)
    })

    it('evaluates empty/unstarted status at 0% progress', () => {
      const res = evaluateNonSubjectGoalProgress('')
      expect(res.status).toBe('CHUA_BAT_DAU')
      expect(res.percent).toBe(0)
    })
  })
})
