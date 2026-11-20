import { prisma } from "@/lib/db"
import { parseRawStudentTestStatus } from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { ResolvedDashboardContext, resolveBenchmarkScore } from "./baseContext"
import {
  computeNextReviewDate,
  isApprovedAdmissionPass,
  isConfirmedEnrollment,
  isDateInMonth,
  matchesLevelFilter,
  normalizePsychologyOutcome,
} from "./stats"
import { CampusQualityAccessScope, DrilldownPayload, DrilldownRecord } from "./types"

function fmtDate(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "Chưa đặt mốc"
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

export async function getCampusQualityDrilldown(
  ctx: ResolvedDashboardContext,
  scope: CampusQualityAccessScope,
  drilldownKey: string,
  extra?: { classId?: string; subjectId?: string }
): Promise<DrilldownPayload> {
  const { academicYearId, scopedClassIds, evaluationPeriod, monthKey } = ctx
  const scopedClassMap = new Map(ctx.scopedClasses.map((c) => [c.id, c]))
  const classIdFilter = scopedClassIds.length > 0 ? { in: scopedClassIds } : { in: ["__NONE__"] }
  const campusIdFilter = ctx.allowedCampusFilter ? { in: ctx.allowedCampusFilter } : undefined

  const defaultCols = {
    nameLabel: "Hồ sơ / Đối tượng",
    subLabel: "Lớp / Phạm vi",
    metricLabel: "Chỉ số / Kết quả",
    statusLabel: "Trạng thái",
    ownerLabel: "Người phụ trách",
    milestoneLabel: "Mốc theo dõi tiếp theo",
  }

  // 1. ENTRANCE DRILLDOWNS (Surveyed / Passed / Enrolled / Pending Current Month)
  if (
    [
      "ENTRANCE_SURVEYED",
      "ENTRANCE_PASSED",
      "ENTRANCE_ENROLLED",
      "ENTRANCE_PENDING_CURRENT_MONTH",
    ].includes(drilldownKey)
  ) {
    const [k12, pre] = await Promise.all([
      prisma.inputAssessmentStudent.findMany({
        where: {
          period: { academicYearId, ...(campusIdFilter ? { campusId: campusIdFilter } : {}) },
        },
        include: { batch: { select: { name: true, startDate: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.preschoolInputAssessmentStudent.findMany({
        where: {
          period: { academicYearId, ...(campusIdFilter ? { campusId: campusIdFilter } : {}) },
        },
        include: { batch: { select: { name: true, startDate: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const all = [
      ...k12.map((a) => ({ ...a, block: "K12" as const })),
      ...pre.map((a) => ({ ...a, block: "MAM_NON" as const })),
    ].filter((a) => {
      const lvl = a.block === "MAM_NON" ? "MAM_NON" : undefined
      if (!matchesLevelFilter(lvl, a.grade, ctx.level)) return false
      if (ctx.grade !== "ALL" && String(a.grade || "").trim() !== ctx.grade) return false
      const st = isApprovedAdmissionPass(a.admissionResult)
      const enrolled = isConfirmedEnrollment(a.enrollmentStatus, a.enrollmentClassId, a.enrollmentDate)
      if (drilldownKey === "ENTRANCE_SURVEYED") return !a.isAbsent
      if (drilldownKey === "ENTRANCE_PASSED") return st.isPassed
      if (drilldownKey === "ENTRANCE_ENROLLED") return enrolled
      const refDate = a.batch?.startDate || a.createdAt
      return !a.isAbsent && st.isPending && isDateInMonth(refDate, ctx.currentSystemMonthKey)
    })

    const records: DrilldownRecord[] = all.map((a) => {
      const st = isApprovedAdmissionPass(a.admissionResult)
      return {
        id: a.id,
        code: a.studentCode,
        name: a.fullName,
        subLabel: `${a.batch?.name || "Đợt chung"} · Khối ${a.grade || "—"}`,
        metricValue: a.admissionResult || "Chờ xét duyệt",
        statusLabel: st.isPassed ? "Đã duyệt đạt" : st.isPending ? "Chờ xét duyệt" : "Không đạt",
        statusTone: st.isPassed ? "emerald" : st.isPending ? "amber" : "rose",
        ownerName: "Ban Tuyển sinh / BGH cơ sở",
        nextMilestone: fmtDate(a.enrollmentDate || a.batch?.startDate || a.updatedAt),
        ssmHref: a.block === "MAM_NON" ? "/admin/xet-duyet-ket-qua?tab=preschool" : "/admin/xet-duyet-ket-qua?tab=k12",
      }
    })

    const titleMap: Record<string, string> = {
      ENTRANCE_SURVEYED: "Danh sách học sinh đã khảo sát đầu vào",
      ENTRANCE_PASSED: "Danh sách học sinh đạt khảo sát (đã duyệt)",
      ENTRANCE_ENROLLED: "Danh sách học sinh đã xác nhận nhập học",
      ENTRANCE_PENDING_CURRENT_MONTH: `Đầu vào chờ xét duyệt · ${ctx.currentSystemMonthLabel}`,
    }

    return {
      drilldownKey,
      title: titleMap[drilldownKey],
      subtitle: `Năm học ${ctx.academicYearName} · ${records.length} hồ sơ`,
      totalCount: records.length,
      columns: defaultCols,
      records: records.slice(0, 300),
    }
  }

  // 2. INCOMPLETE GRADE CLASSES
  if (drilldownKey === "INCOMPLETE_GRADE_CLASSES") {
    const [activeStudents, assignments, grades] = await Promise.all([
      prisma.student.findMany({
        where: { academicYearId, status: "ACTIVE", classId: classIdFilter },
        select: { id: true, classId: true },
      }),
      prisma.teachingAssignment.findMany({
        where: {
          academicYearId,
          classId: classIdFilter,
          semester: evaluationPeriod.endsWith("2") ? 2 : 1,
        },
        include: {
          subject: { select: { subjectName: true } },
          teacher: { select: { teacherName: true } },
        },
      }),
      prisma.subjectGradeEntry.findMany({
        where: { academicYearId, evaluationPeriod, classId: classIdFilter },
        select: { classId: true, subjectId: true, compositeScore: true, ratingValue: true, remark: true },
      }),
    ])

    const sizeByClass = new Map<string, number>()
    for (const s of activeStudents) sizeByClass.set(s.classId, (sizeByClass.get(s.classId) || 0) + 1)

    const validByPair = new Map<string, number>()
    for (const g of grades) {
      const p = parseRawStudentTestStatus({
        rawScoreVal: g.compositeScore,
        remarkText: g.remark,
        ratingText: g.ratingValue,
      })
      if (p.statusInTest !== "MISSING_SCORE") {
        const k = `${g.classId}::${g.subjectId}`
        validByPair.set(k, (validByPair.get(k) || 0) + 1)
      }
    }

    const records: DrilldownRecord[] = []
    for (const ta of assignments) {
      const cls = scopedClassMap.get(ta.classId)
      if (!cls) continue
      const expected = sizeByClass.get(ta.classId) || 0
      const got = validByPair.get(`${ta.classId}::${ta.subjectId}`) || 0
      if (expected > 0 && got < expected) {
        records.push({
          id: `${ta.classId}::${ta.subjectId}`,
          code: cls.classCode,
          name: `Lớp ${cls.className} · ${ta.subject.subjectName}`,
          subLabel: `${cls.campusName} · Khối ${cls.grade}`,
          metricValue: `${got}/${expected} HS có điểm`,
          statusLabel: `Thiếu ${expected - got} điểm`,
          statusTone: "rose",
          ownerName: ta.teacher?.teacherName || "Chưa phân công GV",
          nextMilestone: `Hoàn tất sổ điểm ${ctx.evaluationPeriodLabel}`,
          ssmHref: "/admin/ktdbcl/giam-sat-tien-do?tab=missing-students",
        })
      }
    }

    return {
      drilldownKey,
      title: `Lớp chưa đủ điểm · ${ctx.evaluationPeriodLabel}`,
      subtitle: `${records.length} lớp × môn còn thiếu kết quả`,
      totalCount: records.length,
      columns: defaultCols,
      records: records.slice(0, 300),
    }
  }

  // 3. UNOBSERVED TEACHERS OR PENDING OBSERVATION FORMS
  if (drilldownKey === "UNOBSERVED_TEACHERS" || drilldownKey === "PENDING_OBSERVATION_FORMS") {
    const [teachers, slots] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        },
        include: {
          departmentRel: { select: { name: true } },
          campus: { select: { campusName: true } },
        },
        orderBy: { teacherName: "asc" },
      }),
      prisma.observationSlot.findMany({
        where: { academicYearId, ...(campusIdFilter ? { campusId: campusIdFilter } : {}) },
        include: {
          teacher: { select: { teacherName: true, teacherCode: true } },
          registrations: { include: { evaluation: true } },
        },
      }),
    ])

    const monthSlots = slots.filter((s) => isDateInMonth(s.date, monthKey))
    if (drilldownKey === "UNOBSERVED_TEACHERS") {
      const observedSet = new Set<string>()
      for (const s of monthSlots) {
        if (s.status === "COMPLETED" || s.registrations.some((r) => r.isApproved && r.evaluation)) {
          observedSet.add(s.teacherId)
        }
      }
      const records: DrilldownRecord[] = teachers
        .filter((t) => !observedSet.has(t.id))
        .map((t) => ({
          id: t.id,
          code: t.teacherCode,
          name: t.teacherName,
          subLabel: `${t.departmentRel?.name || "Chưa gán tổ"} · ${t.campus?.campusName || "—"}`,
          metricValue: "0 tiết dự giờ",
          statusLabel: "Chưa được dự giờ",
          statusTone: "amber",
          ownerName: `TTCM ${t.departmentRel?.name || ""}`.trim(),
          nextMilestone: `Sắp lịch trong ${ctx.monthLabel}`,
          ssmHref: "/admin/tong-hop-du-gio",
        }))

      return {
        drilldownKey,
        title: `Giáo viên chưa được dự giờ · ${ctx.monthLabel}`,
        subtitle: `${records.length} giáo viên cần rà soát kế hoạch dự giờ`,
        totalCount: records.length,
        columns: defaultCols,
        records: records.slice(0, 300),
      }
    } else {
      const records: DrilldownRecord[] = []
      for (const s of monthSlots) {
        for (const r of s.registrations) {
          const isPending =
            !r.isApproved ||
            r.evaluation?.reEvaluationStatus === "PENDING" ||
            r.evaluation?.supplementalStatus === "PENDING"
          if (!isPending) continue
          records.push({
            id: r.id,
            code: s.teacher?.teacherCode || "—",
            name: `${s.teacher?.teacherName || "GV"} · ${s.subjectName}`,
            subLabel: `${s.className || `Khối ${s.grade}`} · ${fmtDate(s.date)}`,
            metricValue: !r.isApproved ? "Đăng ký chờ duyệt" : "Phiếu đánh giá lại / bổ sung",
            statusLabel: "Chờ duyệt",
            statusTone: "amber",
            ownerName: "BGH cơ sở / TTCM",
            nextMilestone: fmtDate(s.date),
            ssmHref: "/admin/du-gio",
          })
        }
      }
      return {
        drilldownKey,
        title: `Phiếu dự giờ chờ duyệt · ${ctx.monthLabel}`,
        subtitle: `${records.length} phiếu đang chờ phê duyệt`,
        totalCount: records.length,
        columns: defaultCols,
        records: records.slice(0, 300),
      }
    }
  }

  // 4. PSYCHOLOGY DRILLDOWN (ENFORCED SEPARATE PERMISSION GATE)
  if (
    drilldownKey === "PSYCHOLOGY_ACTIVE" ||
    drilldownKey === "PSYCHOLOGY_DUE" ||
    drilldownKey === "PSYCHOLOGY_ACHIEVED"
  ) {
    if (!scope.canViewPsychology) {
      return {
        drilldownKey,
        title: "Hồ sơ theo dõi tâm lý (Hạn chế phân quyền)",
        subtitle: "Tài khoản chưa được cấp quyền xem chi tiết phân hệ Theo dõi tâm lý",
        totalCount: 0,
        columns: defaultCols,
        records: [],
      }
    }

    const targets = await prisma.learningSupportTarget.findMany({
      where: { academicYearId, supportType: "PSYCHOLOGICAL", student: { classId: classIdFilter } },
      include: {
        student: {
          select: {
            studentCode: true,
            studentName: true,
            class: { select: { className: true, grade: true } },
          },
        },
        assignments: { include: { teacher: { select: { teacherName: true } } } },
        evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    const records: DrilldownRecord[] = []
    for (const t of targets) {
      const latestEval = t.evaluations[0] || null
      const outcome = normalizePsychologyOutcome(t.outcome, latestEval?.trackingLevel, t.terminationStatus)
      const nextReview = computeNextReviewDate(t.startDate, latestEval?.createdAt || null, latestEval?.periodType)
      const isDue = !outcome.isGoalAchieved && (isDateInMonth(nextReview, monthKey) || nextReview <= new Date())

      if (drilldownKey === "PSYCHOLOGY_ACTIVE" && (outcome.isGoalAchieved || t.status !== "ACTIVE")) continue
      if (drilldownKey === "PSYCHOLOGY_DUE" && !isDue) continue
      if (drilldownKey === "PSYCHOLOGY_ACHIEVED" && !outcome.isGoalAchieved) continue

      records.push({
        id: t.id,
        code: t.student.studentCode,
        name: t.student.studentName,
        subLabel: `Lớp ${t.student.class?.className || "—"}`,
        metricValue: outcome.label,
        statusLabel: outcome.isGoalAchieved ? "Đạt mục tiêu" : isDue ? "Đến hạn rà soát" : "Đang theo dõi",
        statusTone: outcome.isGoalAchieved ? "emerald" : isDue ? "amber" : "slate",
        ownerName: t.assignments[0]?.teacher?.teacherName || "Chưa phân công",
        nextMilestone: fmtDate(nextReview),
        ssmHref: `/admin/ktdbcl/support?type=PSYCHOLOGICAL&studentCode=${encodeURIComponent(t.student.studentCode)}`,
      })
    }

    return {
      drilldownKey,
      title:
        drilldownKey === "PSYCHOLOGY_DUE"
          ? `Học sinh đến hạn rà soát tâm lý · ${ctx.monthLabel}`
          : drilldownKey === "PSYCHOLOGY_ACHIEVED"
            ? `Học sinh đạt mục tiêu theo dõi · ${ctx.monthLabel}`
            : `Học sinh đang theo dõi tâm lý · ${ctx.monthLabel}`,
      subtitle: `${records.length} hồ sơ trong phạm vi phân quyền`,
      totalCount: records.length,
      columns: defaultCols,
      records: records.slice(0, 300),
    }
  }

  // 5. ACADEMIC QUALITY DRILLDOWNS (Below Benchmark / Below 5 / Heatmap Cell Class × Subject)
  const targetClassIds = extra?.classId ? [extra.classId] : scopedClassIds
  const targetSubjectId = extra?.subjectId || (ctx.subjectId !== "ALL" ? ctx.subjectId : undefined)

  const [benchmarks, grades, assignments] = await Promise.all([
    prisma.subjectBenchmarkConfig.findMany({
      where: { academicYearId },
      select: { evaluationPeriod: true, level: true, grade: true, subjectId: true, benchmarkScore: true },
    }),
    prisma.subjectGradeEntry.findMany({
      where: {
        academicYearId,
        evaluationPeriod,
        classId: targetClassIds.length > 0 ? { in: targetClassIds } : { in: ["__NONE__"] },
        ...(targetSubjectId ? { subjectId: targetSubjectId } : {}),
      },
      include: {
        student: { select: { id: true, studentCode: true, studentName: true } },
        subject: { select: { subjectName: true } },
      },
    }),
    prisma.teachingAssignment.findMany({
      where: {
        academicYearId,
        classId: targetClassIds.length > 0 ? { in: targetClassIds } : { in: ["__NONE__"] },
      },
      include: { teacher: { select: { teacherName: true } } },
    }),
  ])

  const benchmarkItems = benchmarks.map((b) => ({
    evaluationPeriod: b.evaluationPeriod,
    level: b.level || "ALL",
    grade: b.grade || "ALL",
    subjectId: b.subjectId || "ALL",
    benchmarkScore: b.benchmarkScore,
  }))
  const teacherMap = new Map(
    assignments.map((a) => [`${a.classId}::${a.subjectId}`, a.teacher?.teacherName || "Chưa phân công"])
  )

  const records: DrilldownRecord[] = []
  for (const g of grades) {
    const cls = scopedClassMap.get(g.classId)
    if (!cls) continue
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: g.compositeScore,
      remarkText: g.remark,
      ratingText: g.ratingValue,
    })
    const bm = resolveBenchmarkScore(benchmarkItems, evaluationPeriod, cls.normalizedLevel, cls.grade, g.subjectId)

    if (drilldownKey === "ACADEMIC_BELOW_5") {
      if (parsed.statusInTest !== "VALID_SCORE" || parsed.officialScore === null || parsed.officialScore >= 5.0) {
        continue
      }
    } else if (drilldownKey === "ACADEMIC_BELOW_BENCHMARK") {
      if (
        parsed.statusInTest !== "VALID_SCORE" ||
        parsed.officialScore === null ||
        bm === null ||
        parsed.officialScore >= bm
      ) {
        continue
      }
    }

    const scoreText =
      parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null
        ? `${parsed.officialScore.toFixed(1)}`
        : parsed.statusInTest === "ABSENT_MAKEUP"
          ? "Vắng / Thi bù"
          : parsed.statusInTest === "EXEMPT"
            ? "Miễn"
            : "Chưa có điểm"

    const isBelow =
      parsed.statusInTest === "VALID_SCORE" &&
      parsed.officialScore !== null &&
      bm !== null &&
      parsed.officialScore < bm

    records.push({
      id: g.id,
      code: g.student.studentCode,
      name: g.student.studentName,
      subLabel: `Lớp ${cls.className} · ${g.subject.subjectName}`,
      metricValue: scoreText,
      statusLabel:
        bm === null
          ? "Chưa cấu hình ngưỡng"
          : parsed.statusInTest !== "VALID_SCORE"
            ? scoreText
            : isBelow
              ? `Dưới chuẩn (${bm})`
              : `Đạt chuẩn (≥ ${bm})`,
      statusTone:
        parsed.statusInTest !== "VALID_SCORE"
          ? "slate"
          : bm === null
            ? "amber"
            : isBelow
              ? "rose"
              : "emerald",
      ownerName: teacherMap.get(`${g.classId}::${g.subjectId}`) || "Chưa phân công GV",
      nextMilestone: `Kỳ đánh giá tiếp theo (${ctx.evaluationPeriodLabel})`,
      ssmHref: `/admin/ktdbcl/support?studentCode=${encodeURIComponent(g.student.studentCode)}`,
    })
  }

  return {
    drilldownKey,
    title:
      drilldownKey === "ACADEMIC_BELOW_5"
        ? `Học sinh dưới trung bình (< 5,0) · ${ctx.evaluationPeriodLabel}`
        : drilldownKey === "ACADEMIC_BELOW_BENCHMARK"
          ? `Học sinh dưới chuẩn Sky-Line · ${ctx.evaluationPeriodLabel}`
          : `Danh sách chi tiết kết quả · ${ctx.evaluationPeriodLabel}`,
    subtitle: `${records.length} lượt kết quả trong phạm vi đang lọc`,
    totalCount: records.length,
    columns: defaultCols,
    records: records.slice(0, 400),
  }
}
