import { describe, it, expect } from "vitest"
import {
  buildAchievementLabelMaps,
  resolveAchievementCategoryLabel,
  resolveAchievementLevelLabel,
  resolveAchievementYearLabel,
  extractAchievementDisplayNames,
  normalizeStudentAchievementRow,
} from "../achievementFormatters"

describe("achievementFormatters", () => {
  it("resolves dynamic catalog labels and falls back cleanly without raw codes or CUIDs", () => {
    const maps = buildAchievementLabelMaps(
      [
        { id: "cat1", code: "GIAI_THUONG", name: "Giải thưởng" },
        { id: "cat2", code: "HUY_CHUONG", name: "Huy chương" },
      ],
      [
        { id: "lvl1", code: "3", name: "Giải Ba", categoryId: "cat1" },
        { id: "lvl2", code: "ENGLISH_EXPLORERS", name: "English Explorers", categoryId: "cat1" },
      ],
      [{ id: "cmnsccvbl0002wjbroigj12zd", name: "2026-2027" }]
    )

    expect(resolveAchievementCategoryLabel("GIAI_THUONG", maps.categoryMap)).toBe("Giải thưởng")
    expect(resolveAchievementLevelLabel("3", "GIAI_THUONG", maps.levelMap, maps.categoryMap)).toBe(
      "Giải Ba"
    )
    expect(resolveAchievementLevelLabel("3")).toBe("Giải Ba")
    expect(
      resolveAchievementLevelLabel(
        "ENGLISH_EXPLORERS",
        "GIAI_THUONG",
        maps.levelMap,
        maps.categoryMap
      )
    ).toBe("English Explorers")
    expect(
      resolveAchievementYearLabel({ academicYearId: "cmnsccvbl0002wjbroigj12zd" }, maps.yearMap)
    ).toBe("2026-2027")
    expect(
      resolveAchievementYearLabel({ academicYearId: "cmnsunknowncuid0000000000" }, {}, "2026-2027")
    ).toBe("2026-2027")
  })

  it("normalizes student achievement row matching KTĐBCL report columns", () => {
    const row = normalizeStudentAchievementRow(
      {
        id: "sa_1",
        achievement: {
          id: "ach_1",
          name: "GIẢI BA",
          type: "CA_NHAN",
          category: "GIAI_THUONG",
          level: "3",
          academicYearId: "cmnsccvbl0002wjbroigj12zd",
          exam: { name: "Skyline-Academic Challenge" },
        },
      },
      {
        id: "stu_1",
        studentCode: "0501030134",
        studentName: "Phạm Thị Thanh Phương",
        className: "9UK_CS3",
        campusName: "CS3",
        yearName: "2026-2027",
      }
    )

    expect(row.studentCode).toBe("0501030134")
    expect(row.studentName).toBe("Phạm Thị Thanh Phương")
    expect(row.className).toBe("9UK_CS3")
    expect(row.campusName).toBe("CS3")
    expect(row.examName).toBe("Skyline-Academic Challenge")
    expect(row.achievementName).toBe("GIẢI BA")
    expect(row.categoryLabel).toBe("Giải thưởng")
    expect(row.typeLabel).toBe("Cá nhân")
    expect(row.levelLabel).toBe("Giải Ba")
    expect(row.teacherName).toBe("—")
    expect(row.yearName).toBe("2026-2027")
  })

  it("extracts examName and cleans legacy suffixed achievementName from GVCN approved requests", () => {
    const externalApproved = extractAchievementDisplayNames({
      name: "Giải Nhất — Olympic Tiếng Anh ngoài hệ thống",
      exam: null,
      achievementRequests: [{ examName: "Olympic Tiếng Anh ngoài hệ thống" }],
    })
    expect(externalApproved.examName).toBe("Olympic Tiếng Anh ngoài hệ thống")
    expect(externalApproved.achievementName).toBe("Giải Nhất")

    const pouredToSystemExam = normalizeStudentAchievementRow({
      id: "sa_2",
      achievement: {
        id: "ach_2",
        name: "Huy chương Vàng",
        type: "CA_NHAN",
        category: "HUY_CHUONG",
        level: "VANG",
        exam: { id: "ex_42", name: "Skyline English Quest 2026" },
        achievementRequests: [{ examName: "Skyline English Quest 2026" }],
      },
    })
    expect(pouredToSystemExam.examName).toBe("Skyline English Quest 2026")
    expect(pouredToSystemExam.achievementName).toBe("Huy chương Vàng")
  })
})
