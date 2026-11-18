import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import {
  getAssignedPsychologyTeachers,
  getCampusGiaovuEmail,
  getDepartmentTeachers,
  getStudentOrientationRecord,
  upsertStudentOrientationRecord,
} from "@/lib/orientation/service";
import {
  BM_SHEET_STATUS_OPTIONS,
  PvdhTeacherSummaryD,
  normalizeK12GradeNumber,
} from "./constants";
import type { PvdhActor } from "./auth-guard";

export interface PsychRecipientPerson {
  userId?: string;
  name: string;
  email: string;
  roleLabel: string;
  isPeriodAssigned?: boolean;
}

export interface PsychReferralContext {
  campusCode: string;
  campusName: string;
  giaovuRecipients: PsychRecipientPerson[];
  psychTeacherCandidates: PsychRecipientPerson[];
  defaultPsychTeachers: PsychRecipientPerson[];
}

export interface PsychReferralDispatchResult {
  sent: boolean;
  skipped?: boolean;
  sentAt: string;
  recipients: string[];
  giaovuEmails: string[];
  psychTeacherEmails: string[];
  assignedPsychTeacherNames: string[];
  assignedPsychTeacherId?: string;
  error?: string;
}

const DEFAULT_CAMPUS_GIAOVU_ROUTING: Record<string, string> = {
  CS1: "phuongvt@skylineschool.edu.vn, thuda@skylineschool.edu.vn",
  CS2: "thuda@skylineschool.edu.vn, dunglp@skylineschool.edu.vn",
  CS3: "thuda@skylineschool.edu.vn",
  CS4: "bichtramtt@skylineschool.edu.vn",
  CS5: "dunglp@skylineschool.edu.vn",
};

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSkylineEmail(raw?: string | null): string {
  const s = String(raw || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn");
  if (!s) return "";
  if (s.includes(" ")) return "";
  if (s.includes("@")) return s.toLowerCase();
  if (/^[a-z0-9._-]+$/i.test(s) && !/^\d+$/.test(s)) {
    return `${s.toLowerCase()}@skylineschool.edu.vn`;
  }
  return "";
}

function resolveStudentCampusInfo(student: any): {
  campusId: string | null;
  campusCode: "CS1" | "CS2" | "CS3" | "CS4" | "CS5";
  campusName: string;
} {
  const batchCampus = student?.batch?.campus;
  const rawStr = [
    batchCampus?.campusCode,
    batchCampus?.campusName,
    student?.registeredCampus,
    student?.admissionCampus,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  let campusCode: "CS1" | "CS2" | "CS3" | "CS4" | "CS5" = "CS1";
  if (rawStr.includes("CS5") || rawStr.includes("HỘI AN") || rawStr.includes("HILL") || rawStr.includes("CƠ SỞ 5")) {
    campusCode = "CS5";
  } else if (rawStr.includes("CS4") || rawStr.includes("BEACH") || rawStr.includes("CƠ SỞ 4")) {
    campusCode = "CS4";
  } else if (rawStr.includes("CS3") || rawStr.includes("INTER") || rawStr.includes("CƠ SỞ 3")) {
    campusCode = "CS3";
  } else if (rawStr.includes("CS2") || rawStr.includes("CENTRAL") || rawStr.includes("CƠ SỞ 2")) {
    campusCode = "CS2";
  }

  const campusName =
    batchCampus?.campusName ||
    student?.registeredCampus ||
    student?.admissionCampus ||
    `Cơ sở ${campusCode}`;

  const campusId =
    batchCampus?.id ||
    student?.batch?.campusId ||
    student?.period?.campusId ||
    null;

  return { campusId, campusCode, campusName };
}

/**
 * Xác định danh sách Giáo vụ phụ trách cơ sở và Giáo viên tâm lý được phân công cho học sinh
 */
export async function resolvePsychReferralContext(student: any): Promise<PsychReferralContext> {
  const pAny = prisma as any;
  const { campusId, campusCode, campusName } = resolveStudentCampusInfo(student);

  const giaovuMap = new Map<string, PsychRecipientPerson>();
  const addGiaovu = (person: PsychRecipientPerson) => {
    const email = normalizeSkylineEmail(person.email);
    if (!email) return;
    const existing = giaovuMap.get(email);
    if (!existing) {
      giaovuMap.set(email, { ...person, email });
    } else if (!existing.userId && person.userId) {
      existing.userId = person.userId;
      if (person.name && !existing.name.includes("@")) existing.name = person.name;
    }
  };

  try {
    // 1. Cấu hình định tuyến Email đã lưu trong DB (nếu có) + mặc định theo cơ sở
    const savedRouting =
      typeof pAny.assessmentConfig?.findFirst === "function"
        ? await pAny.assessmentConfig
            .findFirst({
              where: { categoryType: "APPROVAL_EMAIL_CONFIG", code: "EMAIL_ROUTING_V1" },
            })
            .catch(() => null)
        : null;

    let configuredGiaovuStr = DEFAULT_CAMPUS_GIAOVU_ROUTING[campusCode] || getCampusGiaovuEmail(campusCode);
    if (savedRouting?.name) {
      try {
        const parsed = JSON.parse(savedRouting.name);
        if (parsed?.campuses?.[campusCode]?.giaovu) {
          configuredGiaovuStr = String(parsed.campuses[campusCode].giaovu);
        }
      } catch {
        // ignore invalid config JSON
      }
    }

    // 2. Nhân sự Giáo vụ phụ trách cơ sở đang ACTIVE trong CSDL
    const dbGiaoVuUsers =
      typeof pAny.user?.findMany === "function"
        ? await pAny.user
            .findMany({
              where: {
                status: "ACTIVE",
                OR: [
                  { role: { in: ["GIAO_VU", "GIAO_VU_CS", "giao_vu", "giao_vu_cs"] } },
                  { teacher: { position: { in: ["GIAO_VU", "GIAO_VU_CS", "Giáo vụ", "GVU"] } } },
                  { teacher: { positions: { contains: "GIAO_VU" } } },
                  { teacher: { departmentRel: { name: { contains: "Giáo vụ" } } } },
                ],
              },
              include: {
                teacher: { include: { campus: true } },
                campusAssignments: { include: { campus: true } },
              },
            })
            .catch(() => [])
        : [];

    for (const u of dbGiaoVuUsers || []) {
      const assignedCodes = new Set<string>();
      if (u.teacher?.campus?.campusCode) assignedCodes.add(String(u.teacher.campus.campusCode).toUpperCase());
      if (campusId && u.teacher?.campusId === campusId) assignedCodes.add(campusCode);
      for (const ca of u.campusAssignments || []) {
        if (ca?.campus?.campusCode) assignedCodes.add(String(ca.campus.campusCode).toUpperCase());
        if (campusId && ca?.campusId === campusId) assignedCodes.add(campusCode);
      }
      if (assignedCodes.size === 0 || assignedCodes.has(campusCode)) {
        const em = normalizeSkylineEmail(u.teacher?.email || u.email);
        if (em) {
          addGiaovu({
            userId: u.id,
            name: u.fullName || u.teacher?.teacherName || `Giáo vụ ${campusCode}`,
            email: em,
            roleLabel: `Giáo vụ phụ trách ${campusCode}`,
          });
        }
      }
    }

    for (const rawEmail of String(configuredGiaovuStr || "").split(/[,;]/)) {
      const em = normalizeSkylineEmail(rawEmail);
      if (em && !/^(giaovu|tuyensinh|tuvan)\.cs\d+@/i.test(em)) {
        addGiaovu({
          name: em.split("@")[0],
          email: em,
          roleLabel: `Tổ Giáo vụ ${campusCode}`,
        });
      }
    }

    for (const rawFallback of String(getCampusGiaovuEmail(campusCode) || "").split(/[,;]/)) {
      const em = normalizeSkylineEmail(rawFallback);
      if (em && !/^(giaovu|tuyensinh|tuvan)\.cs\d+@/i.test(em)) {
        addGiaovu({
          name: `Tổ Giáo vụ ${campusCode}`,
          email: em,
          roleLabel: `Tổ Giáo vụ ${campusCode}`,
        });
      }
    }
  } catch (err) {
    console.warn("[psych-referral-mail] resolve giaovu warning:", err);
    for (const rawFallback of String(getCampusGiaovuEmail(campusCode) || "").split(/[,;]/)) {
      const em = normalizeSkylineEmail(rawFallback);
      if (em && !/^(giaovu|tuyensinh|tuvan)\.cs\d+@/i.test(em)) {
        addGiaovu({
          name: `Tổ Giáo vụ ${campusCode}`,
          email: em,
          roleLabel: `Tổ Giáo vụ ${campusCode}`,
        });
      }
    }
  }

  // 3. Danh sách GV Tâm lý phân công trong đợt/kỳ + Ca khảo sát + Tổ Tâm lý học đường (TO_TLHN)
  const psychMap = new Map<string, PsychRecipientPerson>();
  const addPsych = (person: PsychRecipientPerson) => {
    const key = person.userId || normalizeSkylineEmail(person.email) || person.name;
    if (!key) return;
    const email = normalizeSkylineEmail(person.email);
    const existing = psychMap.get(key);
    if (!existing) {
      psychMap.set(key, { ...person, email });
    } else {
      if (!existing.email && email) existing.email = email;
      if (person.isPeriodAssigned) {
        existing.isPeriodAssigned = true;
        existing.roleLabel = person.roleLabel;
      }
    }
  };

  try {
    const [periodAssigned, tlhnTeachers, legacyRecord, sessionExaminers] = await Promise.all([
      student?.id ? getAssignedPsychologyTeachers(student.id).catch(() => []) : Promise.resolve([]),
      getDepartmentTeachers("TO_TLHN").catch(() => []),
      student?.id ? getStudentOrientationRecord(student.id).catch(() => null) : Promise.resolve(null),
      student?.batchId
        ? pAny.inputAssessmentSessionExaminer
            ?.findMany({
              where: {
                session: {
                  periodId: student.periodId || undefined,
                  batchId: student.batchId,
                },
              },
              include: { user: { include: { teacher: true } } },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    for (const ap of periodAssigned || []) {
      addPsych({
        userId: ap.userId,
        name: ap.fullName || "Giáo viên Tâm lý",
        email: ap.email || "",
        roleLabel: ap.isBatchAssigned ? "GV tâm lý phân công đợt KS" : "GV tâm lý phân công kỳ KS",
        isPeriodAssigned: true,
      });
    }

    for (const ex of sessionExaminers || []) {
      const codeNorm = String(ex?.subjectCode || "").toLowerCase();
      if ((codeNorm === "tly" || codeNorm.includes("tâm lý")) && ex?.user) {
        addPsych({
          userId: ex.user.id,
          name: ex.user.fullName || ex.user.teacher?.teacherName || "Giáo viên Tâm lý",
          email: ex.user.teacher?.email || ex.user.email || "",
          roleLabel: "GV tâm lý phân công ca khảo sát",
          isPeriodAssigned: true,
        });
      }
    }

    if (legacyRecord?.psychologyTeacherId || legacyRecord?.psychologyTeacherName) {
      let legacyEmail = "";
      if (legacyRecord.psychologyTeacherId) {
        const u = await pAny.user
          ?.findUnique({
            where: { id: legacyRecord.psychologyTeacherId },
            include: { teacher: true },
          })
          .catch(() => null);
        legacyEmail = u?.teacher?.email || u?.email || "";
      }
      addPsych({
        userId: legacyRecord.psychologyTeacherId || undefined,
        name: legacyRecord.psychologyTeacherName || "Giáo viên Tâm lý",
        email: legacyEmail,
        roleLabel: "GV tâm lý đã gán trên hồ sơ",
        isPeriodAssigned: true,
      });
    }

    for (const tt of tlhnTeachers || []) {
      addPsych({
        userId: tt.userId || tt.teacherId,
        name: tt.teacherName || "Chuyên viên Tâm lý",
        email: tt.teacherEmail || "",
        roleLabel: tt.assignmentRole || "Tổ Tâm lý học đường",
        isPeriodAssigned: false,
      });
    }
  } catch (err) {
    console.warn("[psych-referral-mail] resolve psych teachers warning:", err);
  }

  const psychTeacherCandidates = Array.from(psychMap.values());
  const assignedList = psychTeacherCandidates.filter((p) => p.isPeriodAssigned);
  const defaultPsychTeachers =
    assignedList.length > 0
      ? assignedList
      : psychTeacherCandidates.length > 0
        ? [psychTeacherCandidates[0]]
        : [];

  return {
    campusCode,
    campusName,
    giaovuRecipients: Array.from(giaovuMap.values()),
    psychTeacherCandidates,
    defaultPsychTeachers,
  };
}

/**
 * Đồng bộ phân công khảo sát môn Tâm lý (TLY), tạo thông báo chuông và gửi Email
 * đến Giáo vụ phụ trách cơ sở + GV tâm lý phân công khi bấm Đề nghị phỏng vấn tâm lý.
 */
export async function dispatchPvdhPsychReferralNotification(params: {
  student: any;
  record: any;
  summary: PvdhTeacherSummaryD;
  actor: PvdhActor;
  selectedPsychTeacherId?: string | null;
  customNote?: string | null;
  baseUrl?: string | null;
}): Promise<PsychReferralDispatchResult> {
  const { student, record, summary, actor, selectedPsychTeacherId, customNote } = params;
  const pAny = prisma as any;
  const nowIso = new Date().toISOString();
  const nowFormatted = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const ctx = await resolvePsychReferralContext(student);
  const gradeNum = normalizeK12GradeNumber(student?.grade) || "1";
  const eduSys = student?.surveyFormType || student?.surveySystem || "HNS";
  const templateCode = record?.templateCode || `BM.KTĐBCL.${30 + (Number(gradeNum) || 1)}`;

  // Xác định danh sách GV Tâm lý nhận thông báo
  let targetPsychTeachers: PsychRecipientPerson[] = [];
  if (selectedPsychTeacherId) {
    const picked = ctx.psychTeacherCandidates.find((c) => c.userId === selectedPsychTeacherId);
    if (picked) {
      targetPsychTeachers = [
        picked,
        ...ctx.defaultPsychTeachers.filter((d) => d.userId !== picked.userId && d.isPeriodAssigned),
      ];
    }
  }
  if (targetPsychTeachers.length === 0) {
    targetPsychTeachers = ctx.defaultPsychTeachers;
  }

  const primaryPsych = targetPsychTeachers[0] || null;
  const referralReason =
    String(customNote || summary.psychReferralNote || summary.d02 || summary.d04 || "").trim() ||
    `Đề nghị phỏng vấn tâm lý từ Phiếu phỏng vấn định hướng ${templateCode} (Khối ${gradeNum})`;

  // 1. Đảm bảo môn Tâm lý (TLY) được phân công cho GV Tâm lý chính để HS xuất hiện ngay trên danh sách nhập khảo sát
  try {
    if (primaryPsych?.userId && student?.periodId) {
      const tlySubject = await pAny.assessmentSubject
        ?.findFirst({
          where: {
            OR: [
              { code: "TLY" },
              { name: { contains: "Tâm lý" } },
              { name: { contains: "tâm lý" } },
            ],
          },
        })
        .catch(() => null);

      if (tlySubject?.id) {
        const existingAss = await pAny.inputAssessmentTeacherAssignment
          ?.findFirst({
            where: {
              periodId: student.periodId,
              batchId: student.batchId || null,
              userId: primaryPsych.userId,
              subjectId: tlySubject.id,
              grade: gradeNum,
            },
          })
          .catch(() => null);

        if (!existingAss) {
          await pAny.inputAssessmentTeacherAssignment
            ?.create({
              data: {
                periodId: student.periodId,
                batchId: student.batchId || null,
                userId: primaryPsych.userId,
                subjectId: tlySubject.id,
                grade: gradeNum,
                educationSystem: eduSys,
              },
            })
            .catch(() => {});
        }
      }
    }
  } catch (assErr) {
    console.warn("[psych-referral-mail] sync TLY assignment warning:", assErr);
  }

  // 2. Đồng bộ trạng thái sang StudentOrientationRecord để bảng điều hành tiến độ cập nhật tức thì
  try {
    if (student?.id) {
      await upsertStudentOrientationRecord({
        studentId: student.id,
        psychologyReferralStatus: "REQUESTED",
        psychologyReferralReason: referralReason,
        psychologyTeacherId: primaryPsych?.userId || null,
        psychologyTeacherName: primaryPsych?.name || null,
      });
    }
  } catch (oriErr) {
    console.warn("[psych-referral-mail] sync StudentOrientationRecord warning:", oriErr);
  }

  // 3. Tạo thông báo trên chuông hệ thống cho cả GV Tâm lý phân công & Giáo vụ phụ trách cơ sở
  const resolvedBaseUrl = (params.baseUrl || process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn").replace(
    /\/+$/,
    ""
  );
  const teacherAssessmentPath = `/teacher/input-assessments?periodId=${encodeURIComponent(
    student?.periodId || ""
  )}&batchId=${encodeURIComponent(student?.batchId || "")}&studentCode=${encodeURIComponent(
    student?.studentCode || ""
  )}&autoOpen=true`;
  const adminDossierPath = `/admin/xet-duyet-ket-qua?tab=k12&studentId=${encodeURIComponent(student?.id || "")}`;

  try {
    const notifiedUserIds = new Set<string>();
    for (const pt of targetPsychTeachers) {
      if (!pt.userId || notifiedUserIds.has(pt.userId)) continue;
      notifiedUserIds.add(pt.userId);
      await pAny.notification
        ?.create({
          data: {
            userId: pt.userId,
            title: `[Đề nghị phỏng vấn tâm lý] HS ${student?.fullName || ""} (Khối ${gradeNum})`,
            message: `${actor.userName} vừa đề nghị phỏng vấn tâm lý cho HS ${student?.fullName || ""} (${
              student?.studentCode || ""
            } • ${ctx.campusName}) từ phiếu ${templateCode}. Nội dung lưu ý: ${referralReason}`,
            link: teacherAssessmentPath,
            type: "TASK",
            category: "ASSESSMENT",
            priority: "HIGH",
            sourceModule: "PVDH_PSYCH_REFERRAL",
            sourceId: student?.id || record?.id || null,
          },
        })
        .catch(() => {});
    }

    for (const gv of ctx.giaovuRecipients) {
      if (!gv.userId || notifiedUserIds.has(gv.userId)) continue;
      notifiedUserIds.add(gv.userId);
      await pAny.notification
        ?.create({
          data: {
            userId: gv.userId,
            title: `[Điều phối phỏng vấn tâm lý ${ctx.campusCode}] HS ${student?.fullName || ""} (Khối ${gradeNum})`,
            message: `GV ${actor.userName} đề nghị phỏng vấn tâm lý cho HS ${student?.fullName || ""} (${
              student?.studentCode || ""
            }) trên phiếu ${templateCode}.${
              primaryPsych?.name ? ` GV tâm lý phụ trách: ${primaryPsych.name}.` : ""
            }`,
            link: adminDossierPath,
            type: "INFORMATION",
            category: "ASSESSMENT",
            priority: "HIGH",
            sourceModule: "PVDH_PSYCH_REFERRAL",
            sourceId: student?.id || record?.id || null,
          },
        })
        .catch(() => {});
    }
  } catch (notifErr) {
    console.warn("[psych-referral-mail] notification creation warning:", notifErr);
  }

  // 4. Gửi Email chuẩn Sky-Line Academic Ledger đến Giáo vụ phụ trách cơ sở & GV tâm lý phân công
  const giaovuEmails = Array.from(
    new Set(ctx.giaovuRecipients.map((g) => normalizeSkylineEmail(g.email)).filter(Boolean))
  );
  const psychTeacherEmails = Array.from(
    new Set(targetPsychTeachers.map((t) => normalizeSkylineEmail(t.email)).filter(Boolean))
  );
  const allRecipients = Array.from(new Set([...psychTeacherEmails, ...giaovuEmails]));
  const assignedPsychTeacherNames = targetPsychTeachers.map((t) => t.name).filter(Boolean);

  if (allRecipients.length === 0) {
    return {
      sent: false,
      skipped: true,
      sentAt: nowIso,
      recipients: [],
      giaovuEmails,
      psychTeacherEmails,
      assignedPsychTeacherNames,
      assignedPsychTeacherId: primaryPsych?.userId,
      error: "Chưa tìm thấy địa chỉ email hợp lệ của Giáo vụ cơ sở hoặc Giáo viên Tâm lý.",
    };
  }

  const sheetStatusLabel =
    BM_SHEET_STATUS_OPTIONS.find((o) => o.code === summary.sheetStatus)?.label || "Đang thực hiện định hướng";
  const dobDisplay = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
    : "—";

  const emailHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[Sky-line SMS] Đề nghị phỏng vấn tâm lý học sinh ${escapeHtml(student?.fullName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
          <tr>
            <td height="4" bgcolor="#00A19A" style="background-color:#00A19A;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#003B3A" style="background-color:#003B3A;color:#FFFFFF;padding:22px 26px;">
              <div style="font-size:11px;font-weight:700;color:#99F6E4;margin-bottom:6px;">
                Hệ thống Giáo dục Sky-Line &bull; Ban Khảo thí &amp; Đảm bảo chất lượng
              </div>
              <h1 style="margin:0 0 6px 0;font-size:18px;font-weight:800;color:#FFFFFF;line-height:1.35;">
                Thông báo đề nghị phỏng vấn tâm lý học sinh đầu vào
              </h1>
              <div style="font-size:12.5px;color:#CCFBF1;">
                Biểu mẫu nguồn: <strong style="color:#FFFFFF;">${escapeHtml(templateCode)}</strong> (Dành cho khối ${escapeHtml(gradeNum)}) &bull; ${escapeHtml(ctx.campusName)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F0FDFA;border-bottom:1px solid #CCFBF1;padding:12px 26px;font-size:12px;color:#0F172A;line-height:1.55;">
              <div><strong>Kính gửi:</strong> Bộ phận Giáo vụ phụ trách ${escapeHtml(ctx.campusCode)} &amp; Giáo viên Tâm lý phân công (${escapeHtml(
                assignedPsychTeacherNames.join(", ") || "Tổ Tâm lý học đường"
              )})</div>
              <div style="color:#475569;margin-top:2px;">
                Người đề nghị: <strong>${escapeHtml(actor.userName)}</strong> &bull; Thời gian gửi: <span style="font-variant-numeric:tabular-nums;">${escapeHtml(nowFormatted)}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px;">
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#334155;">
                Trong quá trình thực hiện <strong>Phiếu phỏng vấn định hướng học sinh và trao đổi với phụ huynh (${escapeHtml(
                  templateCode
                )})</strong>, giáo viên phỏng vấn đã đánh dấu <strong>Đề nghị phỏng vấn (tâm lí)</strong> để Giáo vụ cơ sở phối hợp xếp lịch và Giáo viên Tâm lý thực hiện trao đổi, đánh giá chuyên môn cho học sinh.
              </p>

              <div style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:18px;">
                <div style="background-color:#003B3A;color:#FFFFFF;padding:9px 14px;font-size:12px;font-weight:700;">
                  1. Thông tin hồ sơ học sinh khảo sát đầu vào
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12.5px;border-collapse:collapse;font-variant-numeric:tabular-nums;">
                  <tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:8px 14px;color:#64748B;width:28%;">Họ và tên học sinh</td>
                    <td style="padding:8px 14px;font-weight:700;color:#0F172A;width:32%;">${escapeHtml(student?.fullName || "—")}</td>
                    <td style="padding:8px 14px;color:#64748B;width:18%;">Mã hồ sơ</td>
                    <td style="padding:8px 14px;font-weight:700;color:#00736E;font-family:monospace;">${escapeHtml(student?.studentCode || "—")}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:8px 14px;color:#64748B;">Ngày sinh</td>
                    <td style="padding:8px 14px;font-weight:600;color:#1E293B;">${escapeHtml(dobDisplay)}</td>
                    <td style="padding:8px 14px;color:#64748B;">Khối / Hệ</td>
                    <td style="padding:8px 14px;font-weight:700;color:#003B3A;">Khối ${escapeHtml(gradeNum)} &bull; ${escapeHtml(eduSys)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:8px 14px;color:#64748B;">Cơ sở &amp; Đợt khảo sát</td>
                    <td style="padding:8px 14px;font-weight:600;color:#1E293B;" colspan="3">${escapeHtml(ctx.campusName)} &bull; ${escapeHtml(
                      student?.batch?.name || student?.period?.name || "Khảo sát đầu vào"
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 14px;color:#64748B;">Phụ huynh tham gia</td>
                    <td style="padding:8px 14px;font-weight:600;color:#1E293B;" colspan="3">${escapeHtml(
                      record?.parentFullName || "Chưa ghi nhận"
                    )}${record?.parentRelationship ? ` (${escapeHtml(record.parentRelationship)})` : ""}${
                      record?.parentContactChannel ? ` &bull; LH: ${escapeHtml(record.parentContactChannel)}` : ""
                    }</td>
                  </tr>
                </table>
              </div>

              <div style="border:1px solid #FDE68A;background-color:#FFFBEB;border-left:4px solid #D97706;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
                <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:4px;">
                  Lý do / nội dung đề nghị phỏng vấn tâm lý
                </div>
                <div style="font-size:12.5px;color:#1E293B;line-height:1.55;white-space:pre-line;">${escapeHtml(referralReason)}</div>
              </div>

              <div style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
                <div style="background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:9px 14px;font-size:12px;font-weight:700;color:#003B3A;">
                  2. Tóm tắt ghi nhận từ Phiếu định hướng (${escapeHtml(templateCode)} &bull; ${escapeHtml(sheetStatusLabel)})
                </div>
                <div style="padding:12px 14px;font-size:12px;line-height:1.6;color:#334155;">
                  <p style="margin:0 0 6px 0;"><strong style="color:#003B3A;">D01. Điểm mạnh nổi bật của HS:</strong> ${escapeHtml(
                    summary.d01?.trim() || "Chưa ghi nhận"
                  )}</p>
                  <p style="margin:0 0 6px 0;"><strong style="color:#003B3A;">D02. Khó khăn, nhu cầu hỗ trợ &amp; nội dung cần xác minh:</strong> ${escapeHtml(
                    summary.d02?.trim() || "Chưa ghi nhận"
                  )}</p>
                  <p style="margin:0 0 6px 0;"><strong style="color:#003B3A;">D03. Kỳ vọng của HS và gia đình:</strong> ${escapeHtml(
                    summary.d03?.trim() || "Chưa ghi nhận"
                  )}</p>
                  <p style="margin:0;"><strong style="color:#003B3A;">D04. Định hướng giáo dục &amp; phối hợp:</strong> ${escapeHtml(
                    summary.d04?.trim() || "Chưa ghi nhận"
                  )}</p>
                </div>
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:4px 0 8px 0;">
                    <a href="${resolvedBaseUrl}${teacherAssessmentPath}" target="_blank" style="display:inline-block;padding:11px 20px;background-color:#003B3A;color:#FFFFFF;font-size:12.5px;font-weight:700;text-decoration:none;border-radius:10px;margin:4px;">
                      Mở cổng nhập khảo sát Tâm lý
                    </a>
                    <a href="${resolvedBaseUrl}${adminDossierPath}" target="_blank" style="display:inline-block;padding:11px 20px;background-color:#008B85;color:#FFFFFF;font-size:12.5px;font-weight:700;text-decoration:none;border-radius:10px;margin:4px;">
                      Xem hồ sơ &amp; điều phối Giáo vụ
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:12px 26px;text-align:center;font-size:11px;color:#64748B;">
              Hệ thống Quản trị Học thuật SSM Sky-Line &bull; Email điều phối tự động từ Phiếu phỏng vấn định hướng đầu vào
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const mailRes = await sendEmail({
      to: allRecipients,
      subject: `[Sky-line SMS] Đề nghị phỏng vấn tâm lý HS ${student?.fullName || ""} (Khối ${gradeNum} - ${ctx.campusCode})`,
      html: emailHtml,
      replyTo: actor.userEmail || "ktdbcl@skylineschool.edu.vn",
    });

    return {
      sent: Boolean(mailRes?.success),
      skipped: Boolean(mailRes?.skipped),
      sentAt: nowIso,
      recipients: allRecipients,
      giaovuEmails,
      psychTeacherEmails,
      assignedPsychTeacherNames,
      assignedPsychTeacherId: primaryPsych?.userId,
      error: mailRes?.success ? undefined : mailRes?.error || mailRes?.reason,
    };
  } catch (err: any) {
    console.error("[psych-referral-mail] sendEmail error:", err);
    return {
      sent: false,
      sentAt: nowIso,
      recipients: allRecipients,
      giaovuEmails,
      psychTeacherEmails,
      assignedPsychTeacherNames,
      assignedPsychTeacherId: primaryPsych?.userId,
      error: err?.message || "Lỗi gửi email thông báo phỏng vấn tâm lý.",
    };
  }
}
