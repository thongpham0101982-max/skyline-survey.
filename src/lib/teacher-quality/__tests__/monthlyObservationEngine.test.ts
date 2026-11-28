import { describe, expect, it } from "vitest"
import {
  aggregateMonthlyObservationRows,
  classifyObservationRecord,
  computeMonthlyTimetablePeriodsByTeacher,
  evaluateObservingCompliance,
  evaluateTeachingCompliance,
  formatSkyLineSeniority,
  getVietnamMonthKey,
  type EngineObservationSlotInput,
  type EngineTargetInput,
  type EngineTeacherInput,
} from "../monthlyObservationEngine"
import {
  computeDueFlags,
  computeNpsScore,
  deduplicateCompetitionCount,
  normalizeCoachingStatus,
  resolveSeniorityReferenceDate,
} from "../recognitionEngine"

describe("Teacher Quality & Monthly Observation Engine — Sky-Line Spec", () => {
  it("attributes observation strictly by actual lesson date (28/11 approved on 02/12 -> month 11)", () => {
    const lessonDate = new Date("2026-11-28T02:00:00.000Z")
    expect(getVietnamMonthKey(lessonDate)).toBe("2026-11")

    const teachers: EngineTeacherInput[] = [
      {
        id: "t-host",
        teacherCode: "GV001",
        teacherName: "Nguyễn Thị An",
        position: "GV",
        campusId: "c1",
        campusName: "CS1 Riverside",
        departmentId: "d1",
        departmentName: "Tổ Toán",
        joinDate: "2023-09-01",
      },
      {
        id: "t-obs",
        teacherCode: "GV002",
        teacherName: "Trần Văn Bình",
        position: "GV",
        campusId: "c1",
        campusName: "CS1 Riverside",
        departmentId: "d1",
        departmentName: "Tổ Toán",
        joinYear: 2021,
      },
    ]

    const targets: EngineTargetInput[] = [
      {
        teacherId: "t-obs",
        observerType: "Giáo viên cũ",
        observeeType: "Giáo viên cũ",
        requiredObserved: 3,
        observedUnit: "tháng",
        requiredTaught: 1,
        taughtUnit: "học kỳ",
        confirmed: true,
      },
    ]

    const slots: EngineObservationSlotInput[] = [
      {
        id: "slot-nov-28",
        teacherId: "t-host",
        teacherName: "Nguyễn Thị An",
        subjectName: "Toán",
        level: "THCS",
        grade: "Khối 7",
        className: "7/1",
        campusId: "c1",
        campusName: "CS1 Riverside",
        topic: "Tam giác bằng nhau",
        date: lessonDate,
        startTime: "08:00",
        endTime: "08:45",
        isDoublePeriod: false,
        status: "COMPLETED",
        requestOrigin: "TEACHER_OPEN",
        registrations: [
          {
            id: "reg-1",
            slotId: "slot-nov-28",
            teacherId: "t-obs",
            teacherName: "Trần Văn Bình",
            isApproved: true,
            approvedAt: new Date("2026-12-02T03:00:00.000Z"),
            evaluation: {
              id: "eval-1",
              registrationId: "reg-1",
              slotId: "slot-nov-28",
              evaluatorId: "t-obs",
              overallRating: "Giỏi",
              totalScore: 19,
              strengths: "Tổ chức hoạt động nhóm tốt",
              improvements: "Phân bổ thời gian luyện tập thêm 5 phút",
              generalComment: "Tiết dạy hiệu quả",
              submittedAt: new Date("2026-12-02T03:00:00.000Z"),
              reEvaluationStatus: null,
              isSupplemental: false,
              supplementalStatus: null,
              supplementalReviewedAt: null,
            },
          },
        ],
      },
    ]

    const novResult = aggregateMonthlyObservationRows({
      monthKey: "2026-11",
      teachers,
      targets,
      slots,
      timetableSlots: [],
      teachingLogs: [],
      coachingByEvaluationId: new Map(),
      coachingCountByTeacherId: new Map(),
    })

    const hostNov = novResult.rows.find((r) => r.teacherId === "t-host")!
    const obsNov = novResult.rows.find((r) => r.teacherId === "t-obs")!
    expect(hostNov.taughtObservedOfficial).toBe(1)
    expect(hostNov.observingCompliance.label).toBe("Chưa có định mức")
    expect(obsNov.observedOfficial).toBe(1)
    expect(obsNov.observedQuotaDisplay).toBe("1/3 tiết")
    expect(obsNov.observingCompliance.label).toBe("Còn thiếu 2 tiết")
    expect(obsNov.seniorityLabel).toBe("Từ năm 2021")

    const decResult = aggregateMonthlyObservationRows({
      monthKey: "2026-12",
      teachers,
      targets,
      slots,
      timetableSlots: [],
      teachingLogs: [],
      coachingByEvaluationId: new Map(),
      coachingCountByTeacherId: new Map(),
    })

    const obsDec = decResult.rows.find((r) => r.teacherId === "t-obs")!
    expect(obsDec.observedOfficial).toBe(0)
    expect(obsDec.observingCompliance.label).toBe("Chưa dự giờ")
  })

  it("counts 1 taught lesson with multiple observers as ONLY 1 taught-observed period for host", () => {
    const teachers: EngineTeacherInput[] = [
      {
        id: "t-host",
        teacherCode: "GV001",
        teacherName: "Cô Hoa",
        position: "GV",
        campusId: "c1",
        campusName: "CS1",
        departmentId: "d1",
        departmentName: "Tổ Văn",
      },
      {
        id: "t-obs-1",
        teacherCode: "GV002",
        teacherName: "Thầy Minh",
        position: "TTCM",
        campusId: "c1",
        campusName: "CS1",
        departmentId: "d1",
        departmentName: "Tổ Văn",
      },
      {
        id: "t-obs-2",
        teacherCode: "GV003",
        teacherName: "Cô Lan",
        position: "GV",
        campusId: "c1",
        campusName: "CS1",
        departmentId: "d1",
        departmentName: "Tổ Văn",
      },
      {
        id: "t-zero",
        teacherCode: "GV004",
        teacherName: "Thầy Nam",
        position: "GV",
        campusId: "c1",
        campusName: "CS1",
        departmentId: "d1",
        departmentName: "Tổ Văn",
      },
    ]

    const targets: EngineTargetInput[] = [
      {
        teacherId: "t-zero",
        observerType: "Giáo viên cũ",
        observeeType: "Giáo viên cũ",
        requiredObserved: 4,
        observedUnit: "tháng",
        requiredTaught: 1,
        taughtUnit: "học kỳ",
        confirmed: true,
      },
    ]

    const slot: EngineObservationSlotInput = {
      id: "slot-multi",
      teacherId: "t-host",
      teacherName: "Cô Hoa",
      subjectName: "Ngữ văn",
      level: "THCS",
      grade: "Khối 8",
      className: "8/2",
      campusId: "c1",
      campusName: "CS1",
      topic: "Phân tích văn bản",
      date: new Date("2026-11-10T02:00:00.000Z"),
      startTime: "09:00",
      endTime: "09:45",
      isDoublePeriod: false,
      status: "COMPLETED",
      requestOrigin: "TEACHER_OPEN",
      registrations: [
        {
          id: "r1",
          slotId: "slot-multi",
          teacherId: "t-obs-1",
          teacherName: "Thầy Minh",
          isApproved: true,
          approvedAt: new Date("2026-11-10T05:00:00.000Z"),
          evaluation: {
            id: "e1",
            registrationId: "r1",
            slotId: "slot-multi",
            evaluatorId: "t-obs-1",
            overallRating: "Tốt",
            totalScore: 18,
            strengths: "Tốt",
            improvements: "Cải thiện đặt câu hỏi mở",
            generalComment: "",
            submittedAt: new Date("2026-11-10T05:00:00.000Z"),
            reEvaluationStatus: null,
            isSupplemental: false,
            supplementalStatus: null,
            supplementalReviewedAt: null,
          },
        },
        {
          id: "r2",
          slotId: "slot-multi",
          teacherId: "t-obs-2",
          teacherName: "Cô Lan",
          isApproved: true,
          approvedAt: new Date("2026-11-10T06:00:00.000Z"),
          evaluation: {
            id: "e2",
            registrationId: "r2",
            slotId: "slot-multi",
            evaluatorId: "t-obs-2",
            overallRating: "Giỏi",
            totalScore: 19,
            strengths: "Hay",
            improvements: "",
            generalComment: "",
            submittedAt: new Date("2026-11-10T06:00:00.000Z"),
            reEvaluationStatus: null,
            isSupplemental: false,
            supplementalStatus: null,
            supplementalReviewedAt: null,
          },
        },
      ],
    }

    const res = aggregateMonthlyObservationRows({
      monthKey: "2026-11",
      teachers,
      targets,
      slots: [slot],
      timetableSlots: [],
      teachingLogs: [],
      coachingByEvaluationId: new Map(),
      coachingCountByTeacherId: new Map(),
    })

    expect(res.rows).toHaveLength(4)
    expect(res.rows.find((r) => r.teacherId === "t-host")!.taughtObservedOfficial).toBe(1)
    expect(res.rows.find((r) => r.teacherId === "t-obs-1")!.observedOfficial).toBe(1)
    expect(res.rows.find((r) => r.teacherId === "t-obs-2")!.observedOfficial).toBe(1)
    expect(res.rows.find((r) => r.teacherId === "t-zero")!.observingCompliance.label).toBe("Chưa dự giờ")
  })

  it("computes seniority per spec: full date, ended academic year cutoff, year-only, and missing", () => {
    const ended = resolveSeniorityReferenceDate(
      { status: "COMPLETED", endDate: "2025-05-31" },
      new Date("2026-11-23")
    )
    expect(ended.isEnded).toBe(true)

    const sFull = formatSkyLineSeniority("2022-09-01", null, ended.referenceDate, null)
    expect(sFull.label).toBe("2 năm 8 tháng")

    const sYearOnly = formatSkyLineSeniority(null, null, new Date("2026-11-23"), 2019)
    expect(sYearOnly.label).toBe("Từ năm 2019")

    const sMissing = formatSkyLineSeniority(null, null, new Date("2026-11-23"), null)
    expect(sMissing.label).toBe("Chưa cập nhật")
  })

  it("evaluates observing compliance with Chưa có định mức / Đủ định mức and teaching compliance independently", () => {
    expect(evaluateObservingCompliance(0, 0, "tháng", false).label).toBe("Chưa có định mức")
    expect(evaluateObservingCompliance(0, 4, "tháng", true).label).toBe("Chưa dự giờ")
    expect(evaluateObservingCompliance(2, 4, "tháng", true).label).toBe("Còn thiếu 2 tiết")
    expect(evaluateObservingCompliance(4, 4, "tháng", true).label).toBe("Đủ định mức")

    expect(
      evaluateTeachingCompliance(1, 1, "tháng", [{ overallRating: "Trung bình", totalScore: 11 }]).code
    ).toBe("NEEDS_IMPROVEMENT")
    expect(
      evaluateTeachingCompliance(1, 1, "tháng", [{ overallRating: "Giỏi", totalScore: 19 }]).code
    ).toBe("TEACHING_COMPLIANT")
  })

  it("deduplicates shared student competition results across co-coaching teachers and calculates NPS & due flags", () => {
    const count = deduplicateCompetitionCount([
      { id: "r1", groupType: "STUDENT_COMPETITION", dedupKey: "HSG_TOAN_2026_SV01" },
      { id: "r2", groupType: "STUDENT_COMPETITION", dedupKey: "HSG_TOAN_2026_SV01" }, // same student result, 2nd teacher
      { id: "r3", groupType: "STUDENT_COMPETITION", dedupKey: null },
      { id: "r4", groupType: "DEPT_AWARD", dedupKey: null },
    ])
    expect(count).toBe(2)

    expect(computeNpsScore(8, 1, 10)).toBe(70)
    expect(normalizeCoachingStatus("PLANNED")).toBe("NOT_STARTED")
    expect(normalizeCoachingStatus("IN_PROGRESS")).toBe("IN_PROGRESS")
    expect(normalizeCoachingStatus("COMPLETED")).toBe("COMPLETED")

    const now = new Date("2026-11-23T06:00:00.000Z")
    expect(computeDueFlags("2026-11-20", "IN_PROGRESS", now)).toEqual({
      isDueSoon: false,
      isOverdue: true,
    })
    expect(computeDueFlags("2026-11-27", "NOT_STARTED", now)).toEqual({
      isDueSoon: true,
      isOverdue: false,
    })
    expect(computeDueFlags("2026-11-20", "COMPLETED", now)).toEqual({
      isDueSoon: false,
      isOverdue: false,
    })
  })

  it("computes monthly timetable periods accurately and classifies non-official records", () => {
    const map = computeMonthlyTimetablePeriodsByTeacher(
      [
        { teacherId: "t1", dayOfWeek: "MONDAY", weekType: "ALL" },
        { teacherId: "t1", dayOfWeek: "TUESDAY", weekType: "EVEN" },
      ],
      "2026-11"
    )
    expect(map.get("t1")?.monthlyPeriods).toBe(7)
    expect(
      classifyObservationRecord({ status: "CANCELLED" }, { isApproved: true, evaluation: null })
        .isCountedOfficial
    ).toBe(false)
  })
})
