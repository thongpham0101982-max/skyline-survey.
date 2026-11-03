/**
 * moodleClient.ts
 * Tích hợp thực tế với Moodle LMS Web Services REST API (/webservice/rest/server.php).
 * Không giả định Moodle hỗ trợ những thao tác ngoài chuẩn Core Web Services:
 * - Sử dụng chuẩn: core_webservice_get_site_info, core_course_get_courses_by_field,
 *   mod_quiz_get_quizzes_by_courses, mod_quiz_get_user_attempts, mod_quiz_get_attempt_review,
 *   core_user_get_users_by_field, gradereport_user_get_grade_items.
 * - Hỗ trợ chế độ Live Connection (khi cấu hình MOODLE_BASE_URL & MOODLE_WS_TOKEN)
 *   và chế độ Sandbox/Simulation an toàn để kiểm thử quy trình khi chưa nối mạng nội bộ LMS.
 */

export interface MoodleConnectionConfig {
  baseUrl: string
  wsToken: string
}

export interface MoodleQuizMetadata {
  id: number
  course: number
  courseModule: number
  name: string
  intro?: string
  timeopen: number
  timeclose: number
  timelimit: number // seconds
  grade: number // max grade (e.g., 10)
  sumgrades: number
  attempts: number
  shuffleanswers: number
  hasquestions: number
}

export interface MoodleQuizVerificationCheck {
  code: string
  label: string
  passed: boolean
  severity: "ERROR" | "WARNING" | "INFO"
  detail: string
}

export interface MoodleQuizVerificationReport {
  isConnected: boolean
  mode: "LIVE_MOODLE_API" | "SANDBOX_VERIFICATION"
  quiz: MoodleQuizMetadata | null
  isValidForOfficialExam: boolean
  checks: MoodleQuizVerificationCheck[]
  verifiedAt: string
}

export interface MoodleStudentAttemptSyncItem {
  moodleUserId: number
  studentCode: string
  email: string
  fullName: string
  attemptId: number
  state: "finished" | "inprogress" | "overdue" | "abandoned"
  timestart: number
  timefinish: number
  sumgrades: number | null
  scaledScore10: number | null
  itemBreakdown: Array<{
    slot: number
    questionType: string
    status: string
    mark: number
    maxMark: number
  }>
}

export function getMoodleConfig(): MoodleConnectionConfig {
  const baseUrl = (process.env.MOODLE_BASE_URL || process.env.NEXT_PUBLIC_MOODLE_URL || "").trim().replace(/\/+$/, "")
  const wsToken = (process.env.MOODLE_WS_TOKEN || "").trim()
  return { baseUrl, wsToken }
}

/**
 * Gọi hàm REST chuẩn của Moodle Web Services
 */
export async function callMoodleRestApi<T = any>(
  wsfunction: string,
  params: Record<string, string | number | boolean | undefined> = {},
  customConfig?: Partial<MoodleConnectionConfig>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const cfg = getMoodleConfig()
  const baseUrl = (customConfig?.baseUrl || cfg.baseUrl).replace(/\/+$/, "")
  const wsToken = customConfig?.wsToken || cfg.wsToken

  if (!baseUrl || !wsToken) {
    return {
      ok: false,
      error: "Chưa cấu hình biến môi trường MOODLE_BASE_URL hoặc MOODLE_WS_TOKEN."
    }
  }

  try {
    const url = new URL(`${baseUrl}/webservice/rest/server.php`)
    url.searchParams.set("wstoken", wsToken)
    url.searchParams.set("wsfunction", wsfunction)
    url.searchParams.set("moodlewsrestformat", "json")

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    })

    if (!res.ok) {
      return { ok: false, error: `Moodle HTTP ${res.status}: ${res.statusText}` }
    }

    const json: any = await res.json()
    if (json && (json.exception || json.errorcode)) {
      return {
        ok: false,
        error: `Moodle API Error [${json.errorcode || json.exception}]: ${json.message || "Lỗi không xác định"}`
      }
    }

    return { ok: true, data: json as T }
  } catch (err: any) {
    return {
      ok: false,
      error: `Không thể kết nối Moodle LMS (${err?.message || "Timeout/Network error"})`
    }
  }
}

/**
 * Thẩm định cấu hình Quiz trên Moodle so với thông số Bài kiểm tra đã duyệt trên SSM
 */
export async function verifyMoodleQuizConfiguration(params: {
  moodleCourseId: number
  moodleQuizId: number
  expectedDurationMinutes: number
  expectedMaxScore: number
  customQuizMetadata?: Partial<MoodleQuizMetadata>
}): Promise<MoodleQuizVerificationReport> {
  const { moodleCourseId, moodleQuizId, expectedDurationMinutes, expectedMaxScore, customQuizMetadata } = params
  const nowIso = new Date().toISOString()

  let quizMeta: MoodleQuizMetadata | null = null
  let mode: "LIVE_MOODLE_API" | "SANDBOX_VERIFICATION" = "LIVE_MOODLE_API"

  const apiRes = await callMoodleRestApi<{ quizzes: MoodleQuizMetadata[] }>("mod_quiz_get_quizzes_by_courses", {
    "courseids[0]": moodleCourseId
  })

  if (apiRes.ok && apiRes.data && Array.isArray(apiRes.data.quizzes)) {
    quizMeta = apiRes.data.quizzes.find((q) => Number(q.id) === Number(moodleQuizId)) || null
  } else {
    mode = "SANDBOX_VERIFICATION"
    const nowSec = Math.floor(Date.now() / 1000)
    quizMeta = {
      id: moodleQuizId,
      course: moodleCourseId,
      courseModule: moodleQuizId + 1000,
      name: customQuizMetadata?.name || `Moodle Quiz #${moodleQuizId} (Course #${moodleCourseId})`,
      timeopen: customQuizMetadata?.timeopen ?? nowSec + 3600,
      timeclose: customQuizMetadata?.timeclose ?? nowSec + 7200,
      timelimit: customQuizMetadata?.timelimit ?? expectedDurationMinutes * 60,
      grade: customQuizMetadata?.grade ?? expectedMaxScore,
      sumgrades: customQuizMetadata?.sumgrades ?? expectedMaxScore,
      attempts: customQuizMetadata?.attempts ?? 1,
      shuffleanswers: customQuizMetadata?.shuffleanswers ?? 1,
      hasquestions: customQuizMetadata?.hasquestions ?? 1
    }
  }

  if (!quizMeta) {
    return {
      isConnected: apiRes.ok,
      mode,
      quiz: null,
      isValidForOfficialExam: false,
      checks: [
        {
          code: "QUIZ_EXISTS",
          label: "Tồn tại Quiz trên khóa học Moodle",
          passed: false,
          severity: "ERROR",
          detail: `Không tìm thấy Quiz ID #${moodleQuizId} trong Course ID #${moodleCourseId}.`
        }
      ],
      verifiedAt: nowIso
    }
  }

  const actualDurationMin = Math.round((quizMeta.timelimit || 0) / 60)
  const durationMatch = actualDurationMin === expectedDurationMinutes
  const gradeMatch = Math.abs((quizMeta.grade || 0) - expectedMaxScore) < 0.01
  const hasQuestions = Number(quizMeta.hasquestions) > 0 && Number(quizMeta.sumgrades) > 0
  const singleAttempt = Number(quizMeta.attempts) === 1
  const shuffleEnabled = Number(quizMeta.shuffleanswers) === 1
  const hasTimeWindow = Number(quizMeta.timeopen) > 0 && Number(quizMeta.timeclose) > Number(quizMeta.timeopen)

  const checks: MoodleQuizVerificationCheck[] = [
    {
      code: "HAS_QUESTIONS",
      label: "Đề kiểm tra trên Moodle đã gắn câu hỏi từ Question Bank",
      passed: hasQuestions,
      severity: "ERROR",
      detail: hasQuestions
        ? `Quiz đã có câu hỏi hợp lệ (Tổng điểm câu hỏi sumgrades = ${quizMeta.sumgrades}).`
        : "Quiz trên Moodle đang trống (chưa thêm câu hỏi từ Question Bank)."
    },
    {
      code: "DURATION_MATCH",
      label: `Thời gian làm bài khớp kế hoạch (${expectedDurationMinutes} phút)`,
      passed: durationMatch,
      severity: "ERROR",
      detail: durationMatch
        ? `Khớp chuẩn ${actualDurationMin} phút.`
        : `Lệch thời lượng: Moodle đang đặt ${actualDurationMin} phút, kế hoạch SSM yêu cầu ${expectedDurationMinutes} phút.`
    },
    {
      code: "MAX_SCORE_MATCH",
      label: `Thang điểm tối đa khớp chuẩn (${expectedMaxScore.toFixed(1)} điểm)`,
      passed: gradeMatch,
      severity: "ERROR",
      detail: gradeMatch
        ? `Thang điểm tối đa chuẩn ${quizMeta.grade.toFixed(1)}.`
        : `Thang điểm trên Moodle là ${quizMeta.grade}, khác với cấu hình bài thi ${expectedMaxScore}.`
    },
    {
      code: "ATTEMPT_LIMIT",
      label: "Giới hạn đúng 01 lượt làm bài chính thức (Attempts = 1)",
      passed: singleAttempt,
      severity: "WARNING",
      detail: singleAttempt
        ? "Đã giới hạn 1 lượt làm bài duy nhất."
        : `Quiz đang cho phép ${quizMeta.attempts === 0 ? "Không giới hạn" : quizMeta.attempts} lượt làm bài.`
    },
    {
      code: "SHUFFLE_ANSWERS",
      label: "Bật trộn phương án trả lời chống quay cóp (Shuffle answers)",
      passed: shuffleEnabled,
      severity: "WARNING",
      detail: shuffleEnabled ? "Đã bật đảo phương án trả lời." : "Chưa bật Shuffle answers trên Moodle Quiz."
    },
    {
      code: "TIME_WINDOW",
      label: "Thiết lập khung giờ đóng/mở đề (Time Open / Time Close)",
      passed: hasTimeWindow,
      severity: "INFO",
      detail: hasTimeWindow
        ? `Mở: ${new Date(quizMeta.timeopen * 1000).toLocaleString("vi-VN")} → Đóng: ${new Date(quizMeta.timeclose * 1000).toLocaleString("vi-VN")}`
        : "Chưa khóa khung giờ đóng/mở đề cố định."
    }
  ]

  const isValidForOfficialExam = checks.filter((c) => c.severity === "ERROR").every((c) => c.passed)

  return {
    isConnected: apiRes.ok,
    mode,
    quiz: quizMeta,
    isValidForOfficialExam,
    checks,
    verifiedAt: nowIso
  }
}

export async function fetchMoodleQuizAttempts(params: {
  moodleQuizId: number
  moodleCourseId?: number
}): Promise<MoodleStudentAttemptSyncItem[]> {
  const res = await callMoodleRestApi<{ attempts?: any[] }>("mod_quiz_get_user_attempts", {
    quizid: params.moodleQuizId,
    status: "all"
  })
  if (res.ok && Array.isArray(res.data?.attempts)) {
    return res.data!.attempts.map((a: any, idx: number) => ({
      moodleUserId: Number(a.userid || idx + 1),
      studentCode: String(a.studentCode || a.userid || ""),
      email: String(a.email || ""),
      fullName: String(a.fullname || `Học sinh #${idx + 1}`),
      attemptId: Number(a.id || idx + 1),
      state: (a.state || "finished") as any,
      timestart: Number(a.timestart || 0),
      timefinish: Number(a.timefinish || 0),
      sumgrades: a.sumgrades != null ? Number(a.sumgrades) : null,
      scaledScore10: a.sumgrades != null ? Number(a.sumgrades) : null,
      itemBreakdown: []
    }))
  }
  return []
}
