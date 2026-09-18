import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Performance, Caching & System Optimization Audit (Giai đoạn 8)', () => {
  describe('Database Singleton & Connection Pool (src/lib/db/index.ts)', () => {
    it('Persists PrismaClient instance on globalThis to prevent connection exhaustion', () => {
      const dbPath = path.join(process.cwd(), 'src/lib/db/index.ts')
      expect(fs.existsSync(dbPath)).toBe(true)
      const content = fs.readFileSync(dbPath, 'utf-8')

      expect(content).toContain('globalThis.prismaGlobal = prisma')
      expect(content).toContain('globalThis.prismaGlobal ?? createPrismaClient()')
    })
  })

  describe('Smart Polling & Resource Optimization (src/components/NotificationBell.tsx)', () => {
    it('Uses Page Visibility API and focus events to avoid hammering database when inactive', () => {
      const bellPath = path.join(process.cwd(), 'src/components/NotificationBell.tsx')
      expect(fs.existsSync(bellPath)).toBe(true)
      const content = fs.readFileSync(bellPath, 'utf-8')

      expect(content).toContain('visibilitychange')
      expect(content).toContain('document.visibilityState === "visible"')
      expect(content).toContain('window.addEventListener("focus"')
      expect(content).toContain('30000') // 30s interval instead of aggressive 15s
    })
  })

  describe('Notification API Parallel Count & Headers (src/app/api/notifications/route.ts)', () => {
    it('Queries notifications and unreadCount in parallel and sets Cache-Control headers', () => {
      const notifApiPath = path.join(process.cwd(), 'src/app/api/notifications/route.ts')
      expect(fs.existsSync(notifApiPath)).toBe(true)
      const content = fs.readFileSync(notifApiPath, 'utf-8')

      expect(content).toContain('Promise.all')
      expect(content).toContain('prisma.notification.count')
      expect(content).toContain('Cache-Control')
      expect(content).toContain('must-revalidate')
    })
  })
})
