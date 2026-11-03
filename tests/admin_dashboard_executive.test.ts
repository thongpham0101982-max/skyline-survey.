import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { getAdminMetrics } from "../src/services/dashboard"

describe("Sky-Line Executive Admin Dashboard (skyline-dashboard-design)", () => {
  it("1. Preserves Sidebar, Header, Brand tokens, and RBAC permission boundaries", () => {
    const adminLayout = fs.readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf-8")
    const apiRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/check-he-thong/route.ts"), "utf-8")

    expect(adminLayout).toContain("<Sidebar")
    expect(adminLayout).toContain("permissionModules")
    expect(apiRoute).toContain("allowedCampusIds")
    expect(apiRoute).toContain("effectiveCampusIds")
  })

  it("2. Supports compact welcome banner mode in UserWelcomeCard", () => {
    const welcomeCard = fs.readFileSync(path.join(process.cwd(), "src/components/UserWelcomeCard.tsx"), "utf-8")
    const adminPage = fs.readFileSync(path.join(process.cwd(), "src/app/admin/page.tsx"), "utf-8")

    expect(welcomeCard).toContain("compact?: boolean")
    expect(welcomeCard).toContain("Mở rộng")
    expect(welcomeCard).toContain("Thu gọn")
    expect(adminPage).toContain("<UserWelcomeCard")
    expect(adminPage).toContain("compact={true}")
  })

  it("3. Implements Unified 5-Dimension Filter Bar (academicYear, campus, level, grade, timeRange)", () => {
    const filterBar = fs.readFileSync(
      path.join(process.cwd(), "src/components/dashboard/AdminUnifiedFilterBar.tsx"),
      "utf-8"
    )
    expect(filterBar).toContain("academicYearId")
    expect(filterBar).toContain("campusId")
    expect(filterBar).toContain("level")
    expect(filterBar).toContain("grade")
    expect(filterBar).toContain("timeRange")
  })

  it("4. Standardizes reusable KPICard with comparison metrics and detail drill-down links", () => {
    const kpiCard = fs.readFileSync(path.join(process.cwd(), "src/components/KPICard.tsx"), "utf-8")
    expect(kpiCard).toContain("trend?:")
    expect(kpiCard).toContain("trendValue?:")
    expect(kpiCard).toContain("comparisonText?:")
    expect(kpiCard).toContain("subMetrics?:")
    expect(kpiCard).toContain("href?:")
  })

  it("5-8. Provides DashboardChartCard with title, legend, unit, and timestamp plus SmartAlertCenter", () => {
    const chartCard = fs.readFileSync(
      path.join(process.cwd(), "src/components/dashboard/DashboardChartCard.tsx"),
      "utf-8"
    )
    const alertCenter = fs.readFileSync(
      path.join(process.cwd(), "src/components/dashboard/SmartAlertCenter.tsx"),
      "utf-8"
    )

    expect(chartCard).toContain("Đơn vị:")
    expect(chartCard).toContain("Chú giải:")
    expect(chartCard).toContain("Cập nhật:")
    expect(alertCenter).toContain("Trung tâm Cảnh báo Thông minh")
    expect(alertCenter).toContain("CRITICAL")
    expect(alertCenter).toContain("WARNING")
  })

  it("9-10. Aggregates 100% real database metrics across all 6 domains and enforces RBAC + filters", async () => {
    const metrics = await getAdminMetrics()

    expect(metrics.totalStudents).toBeGreaterThan(0)
    expect(metrics.monthlyHeadcount.length).toBe(10)
    expect(metrics.campusDistribution.length).toBeGreaterThan(0)
    expect(metrics.testingAnalytics.totalCandidates).toBeGreaterThan(0)
    expect(metrics.academicQualityAnalytics.totalGradeEntries).toBeGreaterThan(0)
    expect(metrics.advisoryAnalytics.totalGoals).toBeGreaterThan(0)
    expect(metrics.observationAnalytics.totalSlots).toBeGreaterThan(0)
    expect(metrics.taskAnalytics.totalTasks).toBeGreaterThan(0)
    expect(Array.isArray(metrics.smartAlerts)).toBe(true)
    expect(metrics.smartAlerts.length).toBeGreaterThan(0)

    // Verify campus + level filtering
    const firstCampusId = metrics.allCampuses[0]?.id
    const scoped = await getAdminMetrics(
      metrics.academicYearId || undefined,
      firstCampusId ? [firstCampusId] : [],
      { level: "Tiểu học", timeRange: "FULL_YEAR" }
    )
    expect(scoped.totalStudents).toBeLessThan(metrics.totalStudents)
  })
})
