import fs from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import {
  KTDBCL_MANAGED_POSITION_CODES,
  KTDBCL_POSITION_CATALOG,
  parseCsvMatrix,
  parseKtdbclRaciMatrixRows,
} from "../positionRaciParser"
import { buildTemplateSnapshot } from "../positionRaciSchema"

describe("KT&ĐBCL Position-based RACI Matrix Parser & Acceptance Criteria", () => {
  const csvPath = path.join(process.cwd(), "docs", "KTDBCL_MaTran_RACI_ChuanHoa_18_8_2026.csv")
  const csvText = fs.readFileSync(csvPath, "utf-8")
  const rows = parseCsvMatrix(csvText)
  const templates = parseKtdbclRaciMatrixRows(rows)

  it("defines all 07 managed positions with exact codes", () => {
    expect(KTDBCL_POSITION_CATALOG).toHaveLength(7)
    expect(KTDBCL_POSITION_CATALOG.map((p) => p.positionCode)).toEqual([
      "VT293",
      "VT295",
      "VT281",
      "VT282",
      "VT250",
      "VT303",
      "VT251",
    ])
  })

  it("parses exactly 78 unique task templates from 2.1.1 to 6.3.5", () => {
    expect(templates).toHaveLength(78)
    expect(templates[0].itemCode).toBe("2.1.1")
    expect(templates[templates.length - 1].itemCode).toBe("6.3.5")
    const uniqueCodes = new Set(templates.map((t) => t.itemCode))
    expect(uniqueCodes.size).toBe(78)
  })

  it("matches exact R link counts for every one of the 07 positions", () => {
    const rCounts: Record<string, number> = {}
    for (const code of KTDBCL_MANAGED_POSITION_CODES) rCounts[code] = 0
    for (const tpl of templates) {
      for (const rPos of tpl.rPositions) {
        rCounts[rPos] = (rCounts[rPos] || 0) + 1
      }
    }

    expect(rCounts).toEqual({
      VT293: 8,
      VT295: 2,
      VT281: 16,
      VT282: 15,
      VT250: 13,
      VT303: 15,
      VT251: 17,
    })
  })

  it("assigns VT123 as sole Accountable (A) on all 78 templates", () => {
    for (const tpl of templates) {
      expect(tpl.accountablePositionCode).toBe("VT123")
    }
  })

  it("gives VT295 exactly two direct R templates (2.4.1 & 3.5.1) and C advisory roles elsewhere", () => {
    const vt295R = templates.filter((t) => t.rPositions.includes("VT295")).map((t) => t.itemCode)
    expect(vt295R).toEqual(["2.4.1", "3.5.1"])

    const vt295C = templates.filter((t) => t.cPositions.includes("VT295"))
    expect(vt295C.length).toBeGreaterThan(20)
  })

  it("preserves verbatim 2.4.1 source data and attaches adminNote 'Cần xác nhận đối tượng khảo sát'", () => {
    const t241 = templates.find((t) => t.itemCode === "2.4.1")
    expect(t241).toBeDefined()
    expect(t241!.mainTask).toContain("Học sinh")
    expect(t241!.deliverables).toContain("PHHS")
    expect(t241!.adminNote).toBe("Cần xác nhận đối tượng khảo sát")
  })

  it("suggests domain-aligned tasks for VT282, VT281, VT250, VT303, VT251", () => {
    const hasR = (pos: string, kw: string) =>
      templates.some(
        (t) => t.rPositions.includes(pos) && `${t.mainTask} ${t.detailTask}`.toLowerCase().includes(kw)
      )

    expect(hasR("VT282", "mầm non")).toBe(true)
    expect(hasR("VT281", "phổ thông")).toBe(true)
    expect(hasR("VT281", "dự giờ")).toBe(true)
    expect(hasR("VT250", "thư viện câu hỏi")).toBe(true)
    expect(hasR("VT303", "lms")).toBe(true)
    expect(hasR("VT251", "kỳ thi ctqt")).toBe(true)
  })

  it("maps 4.6.2 to both VT250 and VT303 as joint R roles", () => {
    const t462 = templates.find((t) => t.itemCode === "4.6.2")
    expect(t462).toBeDefined()
    expect(t462!.rPositions).toEqual(expect.arrayContaining(["VT250", "VT303"]))
    expect(t462!.rPositions).toHaveLength(2)
  })

  it("preserves immutable template snapshot even if template is edited later", () => {
    const t211 = templates[0]
    const fakeRecord: any = { ...t211, id: "tpl_1", isActive: true, version: 1, updatedByName: null, updatedAt: null }
    const snapshot = buildTemplateSnapshot(fakeRecord, "VT282")

    // Mutate template after assignment
    fakeRecord.title = "Modified Title v2"
    fakeRecord.version = 2

    expect(snapshot.version).toBe(1)
    expect(snapshot.title).toBe(t211.title)
    expect(snapshot.itemCode).toBe("2.1.1")
    expect(snapshot.selectedPositionCode).toBe("VT282")
  })
})
