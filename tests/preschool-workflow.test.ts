import { describe, it, expect } from "vitest"
import {
  PRESCHOOL_FORM_REGISTRY,
  PRESCHOOL_WORKFLOW_STATUSES,
  addBusinessDays,
  evaluatePreApprovalGate,
  resolvePreschoolAdmissionResult,
  sanitizeRoundForViewer,
  suggestPreschoolForm,
  validateFollowUpBusinessDays,
} from "@/lib/preschool-workflow"
import {
  createWorkflowQuickApproveToken,
  verifyWorkflowQuickApproveToken,
} from "@/lib/preschool-approval-service"
import { isApprovedAdmissionPass } from "@/lib/campus-quality/stats"

describe("Quy trình Khảo sát đầu vào Mầm non 2026 (B1–B13)", () => {
  it("defines all 8 required workflow statuses and all 12 BM.KTĐBCL forms", () => {
    expect(PRESCHOOL_WORKFLOW_STATUSES).toEqual([
      "DA_HEN",
      "DANG_DANH_GIA",
      "CHO_PHONG_VAN_TAM_LY",
      "CHO_TRAI_NGHIEM",
      "CHO_DUYET",
      "DA_DUYET",
      "DA_TRA_KET_QUA",
      "DA_LUU_HO_SO",
    ])

    const expectedCodes = [
      "BM.KTĐBCL.05",
      "BM.KTĐBCL.10",
      "BM.KTĐBCL.11",
      "BM.KTĐBCL.01",
      "BM.KTĐBCL.02",
      "BM.KTĐBCL.03",
      "BM.KTĐBCL.08",
      "BM.KTĐBCL.06",
      "BM.KTĐBCL.07",
      "BM.KTĐBCL.09",
      "BM.KTĐBCL.17",
      "BM.KTĐBCL.04",
    ]
    for (const code of expectedCodes) {
      expect(PRESCHOOL_FORM_REGISTRY[code]).toBeDefined()
      expect(PRESCHOOL_FORM_REGISTRY[code].version).toBeTruthy()
    }
  })

  it("suggests exact forms by age group, Hệ S and Hệ Global", () => {
    expect(
      suggestPreschoolForm({ dateOfBirth: "2025-07-01", surveyDate: "2026-10-01", grade: "Nhà trẻ 12-18 tháng", surveySystem: "Hệ S" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.05")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2024-12-01", surveyDate: "2026-10-01", grade: "Nhà trẻ 18-24 tháng", surveySystem: "Hệ Global" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.10")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2024-04-01", surveyDate: "2026-10-01", grade: "Nhà trẻ 24-36 tháng", surveySystem: "Hệ S" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.11")

    // Mẫu giáo Hệ S
    expect(
      suggestPreschoolForm({ dateOfBirth: "2023-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo bé", surveySystem: "Hệ S" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.01")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2022-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo nhỡ", surveySystem: "Hệ S" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.02")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2021-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo lớn", surveySystem: "Hệ S" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.03")

    // Mẫu giáo Hệ Global
    expect(
      suggestPreschoolForm({ dateOfBirth: "2023-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo bé", surveySystem: "Hệ Global" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.08")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2022-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo nhỡ", surveySystem: "Hệ Global" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.06")
    expect(
      suggestPreschoolForm({ dateOfBirth: "2021-04-01", surveyDate: "2026-10-01", grade: "Mẫu giáo lớn", surveySystem: "Hệ Global" }).suggestedFormCode
    ).toBe("BM.KTĐBCL.07")
  })

  it("flags age boundary cases to require manual form confirmation", () => {
    // Exactly 36 months at survey date -> boundary between Nhà trẻ 24-36 and Mẫu giáo bé
    const res = suggestPreschoolForm({
      dateOfBirth: "2023-10-01",
      surveyDate: "2026-10-01",
      grade: "Mẫu giáo bé",
      surveySystem: "Hệ S",
    })
    expect(res.isAgeBoundary).toBe(true)
    expect(res.boundaryReason).toContain("36 tháng")
  })

  it("enforces minimum 2 business days (skipping weekends) for B7B follow-up scheduling", () => {
    // Friday 2026-11-20 + 2 business days -> Tuesday 2026-11-24
    const friday = new Date("2026-11-20T09:00:00Z")
    const earliest = addBusinessDays(friday, 2)
    expect(earliest.getDay()).toBe(2) // Tuesday

    const tooEarly = validateFollowUpBusinessDays(friday, new Date("2026-11-23T09:00:00Z"), 2)
    expect(tooEarly.valid).toBe(false)

    const validDate = validateFollowUpBusinessDays(friday, new Date("2026-11-24T09:00:00Z"), 2)
    expect(validDate.valid).toBe(true)
  })

  it("enforces pre-approval gates for all branches including BM.KTĐBCL.09 + MS Teams", () => {
    // Khảo sát mới incomplete
    expect(evaluatePreApprovalGate({ roundType: "KHAO_SAT_MOI" }).ready).toBe(false)

    // Khảo sát mới complete
    expect(
      evaluatePreApprovalGate({
        roundType: "KHAO_SAT_MOI",
        medicalCheckedAt: new Date().toISOString(),
        formCode: "BM.KTĐBCL.01",
        isAgeBoundary: false,
        teacherSubmittedAt: new Date().toISOString(),
        reviewDecision: "DE_XUAT_DAT",
        reviewedAt: new Date().toISOString(),
      }).ready
    ).toBe(true)

    // Tâm lý B7A missing MS Teams report -> blocked
    const psyBlocked = evaluatePreApprovalGate({
      roundType: "PHONG_VAN_TAM_LY",
      psychologyPayloadJson: "{}",
      msTeamsReported: false,
      reviewDecision: "DE_XUAT_DAT",
      reviewedAt: new Date().toISOString(),
    })
    expect(psyBlocked.ready).toBe(false)
    expect(psyBlocked.missing.some((m) => m.includes("MS Teams"))).toBe(true)

    // Tâm lý B7A complete -> ready
    expect(
      evaluatePreApprovalGate({
        roundType: "PHONG_VAN_TAM_LY",
        psychologyPayloadJson: "{}",
        msTeamsReported: true,
        reviewDecision: "DE_XUAT_DAT",
        reviewedAt: new Date().toISOString(),
      }).ready
    ).toBe(true)

    // Học trải nghiệm B4B complete -> ready
    expect(
      evaluatePreApprovalGate({
        roundType: "HOC_TRAI_NGHIEM",
        experienceObservation: "Trẻ hợp tác tốt trong lớp.",
        reviewDecision: "DE_XUAT_DAT",
        reviewedAt: new Date().toISOString(),
      }).ready
    ).toBe(true)
  })

  it("strips sensitive health & psychology fields for unauthorized roles", () => {
    const rawRound = {
      id: "r1",
      heightCm: 105,
      weightKg: 17,
      bmi: 15.4,
      physicalStatus: "BINH_THUONG",
      physicalNote: "Dị ứng nhẹ",
      medicalCheckedAt: "2026-11-23T08:00:00Z",
      psychologyPayloadJson: '{"formCode":"BM.KTĐBCL.09"}',
      msTeamsReportNote: "Đã báo cáo nhóm tâm lý",
      assignedMedicalId: "med1",
      assignedPsychologistId: "psy1",
      assignedTeacherId: "gv1",
    }

    // Tư vấn cannot see health details or psychology details
    const forTuVan = sanitizeRoundForViewer(rawRound, { userId: "tv1", role: "TU_VAN", roles: ["TU_VAN"] })
    expect(forTuVan.canViewHealth).toBe(false)
    expect(forTuVan.canViewPsychology).toBe(false)
    expect(forTuVan.heightCm).toBeNull()
    expect(forTuVan.psychologyPayloadJson).toBeNull()

    // Y tế can see health details, NOT psychology details
    const forYTe = sanitizeRoundForViewer(rawRound, { userId: "med1", role: "Y_TE", roles: ["Y_TE"] })
    expect(forYTe.canViewHealth).toBe(true)
    expect(forYTe.heightCm).toBe(105)
    expect(forYTe.canViewPsychology).toBe(false)
    expect(forYTe.psychologyPayloadJson).toBeNull()

    // GĐCS / Nhóm trưởng MN can see both
    const forGdcs = sanitizeRoundForViewer(rawRound, { userId: "gdcs1", role: "GDCS", roles: ["GDCS"] })
    expect(forGdcs.canViewHealth).toBe(true)
    expect(forGdcs.canViewPsychology).toBe(true)
    expect(forGdcs.psychologyPayloadJson).toContain("BM.KTĐBCL.09")
  })

  it("creates, verifies, and rejects tampered/expired 1-tap email approval tokens", () => {
    const token = createWorkflowQuickApproveToken({
      studentId: "stu_1",
      roundId: "rnd_1",
      step: "B10",
      decision: "DAT",
      approverEmail: "GDCS@SkylineSchool.edu.vn",
      approverName: "Giám đốc CS",
    })

    const ok = verifyWorkflowQuickApproveToken(token)
    expect(ok.valid).toBe(true)
    if (ok.valid) {
      expect(ok.payload.studentId).toBe("stu_1")
      expect(ok.payload.decision).toBe("DAT")
      expect(ok.payload.approverEmail).toBe("gdcs@skylineschool.edu.vn")
    }

    // Tampered token fails
    expect(verifyWorkflowQuickApproveToken(token + "x").valid).toBe(false)

    // Expired token fails
    const expired = createWorkflowQuickApproveToken(
      {
        studentId: "stu_1",
        step: "B10",
        decision: "CHUA_DAT",
        approverEmail: "gdcs@skylineschool.edu.vn",
      },
      -1000
    )
    expect(verifyWorkflowQuickApproveToken(expired).valid).toBe(false)
  })

  it("fixes P0 bugs: Miễn Học Thử classification & BGH DAT_HOC_THU preservation", () => {
    expect(isApprovedAdmissionPass("Đạt - Miễn Học Thử")).toEqual({
      isPassed: true,
      isCommitted: false,
      isPending: false,
    })
    expect(isApprovedAdmissionPass("Đạt - Học Thử")).toEqual({
      isPassed: true,
      isCommitted: true,
      isPending: false,
    })
    expect(
      resolvePreschoolAdmissionResult({ bghStatus: "DAT_HOC_THU", gdcsStatus: "DAT" })
    ).toBe("Đạt - Học Thử")
  })
})
