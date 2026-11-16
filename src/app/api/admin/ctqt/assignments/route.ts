import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel, isCtqtClass, compareCtqtClasses } from "@/lib/ctqt/config";
import { sendEmail } from "@/lib/mail";
import { renderSkylineEmail, formatMarkdownToHtml } from "@/lib/email-templates";

function resolveTeacherEmail(teacher: any): string | null {
  if (!teacher) return null;
  const isValid = (raw?: string | null): string | null => {
    if (!raw) return null;
    let clean = raw.trim().toLowerCase();
    if (!clean || clean.includes(" ")) return null;
    if (!clean.includes("@")) {
      if (/^\d+$/.test(clean)) return null;
      clean = `${clean}@skylineschool.edu.vn`;
    }
    const local = clean.split("@")[0];
    if (!local || /^\d+$/.test(local) || clean.includes("noreply")) return null;
    return clean;
  };
  return isValid(teacher.email) || isValid(teacher.user?.email) || null;
}

function getSubjectLabelVi(subjectCode: string): string {
  for (const cfg of Object.values(CTQT_LEVEL_CONFIGS)) {
    const found = cfg.subjects.find(s => s.code === subjectCode);
    if (found) return `${found.nameVi} (${found.code})`;
  }
  return subjectCode;
}

async function sendCtqtAssignmentEmails(params: {
  academicYearId: string;
  semester: number;
  teacherIds?: string[];
  classIds?: string[];
  campusId?: string;
  roleScope?: "BOTH" | "PRIMARY_ONLY" | "DELEGATED_ONLY";
  customMessage?: string;
}) {
  const {
    academicYearId,
    semester,
    teacherIds,
    classIds,
    campusId,
    roleScope = "BOTH",
    customMessage,
  } = params;

  const yearRecord = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
    select: { name: true },
  });
  const yearName = yearRecord?.name || "2026-2027";

  const whereClause: any = {
    academicYearId,
    semester,
  };
  if (Array.isArray(classIds) && classIds.length > 0) {
    whereClause.classId = { in: classIds };
  }
  if (campusId) {
    whereClause.class = { campusId };
  }
  if (Array.isArray(teacherIds) && teacherIds.length > 0) {
    whereClause.OR = [
      { primaryTeacherId: { in: teacherIds } },
      { delegatedTeacherId: { in: teacherIds } },
    ];
  }

  const records = await prisma.ctqtTeachingAssignment.findMany({
    where: whereClause,
    include: {
      class: {
        select: {
          id: true,
          className: true,
          campus: { select: { campusCode: true, campusName: true } },
        },
      },
      primaryTeacher: {
        select: {
          id: true,
          teacherName: true,
          teacherCode: true,
          email: true,
          user: { select: { email: true } },
        },
      },
      delegatedTeacher: {
        select: {
          id: true,
          teacherName: true,
          teacherCode: true,
          email: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { class: { className: "asc" } },
  });

  if (records.length === 0) {
    return {
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      skippedTeachers: [] as string[],
    };
  }

  const targetTeacherSet =
    Array.isArray(teacherIds) && teacherIds.length > 0 ? new Set(teacherIds) : null;

  const teacherMap = new Map<
    string,
    {
      teacher: any;
      primaryByClass: Map<string, { className: string; campusLabel: string; subjects: string[] }>;
      delegatedByClass: Map<string, { className: string; campusLabel: string; subjects: string[] }>;
    }
  >();

  const ensureEntry = (t: any) => {
    if (!teacherMap.has(t.id)) {
      teacherMap.set(t.id, {
        teacher: t,
        primaryByClass: new Map(),
        delegatedByClass: new Map(),
      });
    }
    return teacherMap.get(t.id)!;
  };

  for (const rec of records) {
    const className = rec.class?.className || "Lớp CTQT";
    const campusLabel = rec.class?.campus?.campusCode || rec.class?.campus?.campusName || "";
    const subjLabel = getSubjectLabelVi(rec.subjectCode);

    if (
      (roleScope === "BOTH" || roleScope === "PRIMARY_ONLY") &&
      rec.primaryTeacher &&
      (!targetTeacherSet || targetTeacherSet.has(rec.primaryTeacher.id))
    ) {
      const entry = ensureEntry(rec.primaryTeacher);
      if (!entry.primaryByClass.has(rec.classId)) {
        entry.primaryByClass.set(rec.classId, { className, campusLabel, subjects: [] });
      }
      const clsItem = entry.primaryByClass.get(rec.classId)!;
      if (!clsItem.subjects.includes(subjLabel)) clsItem.subjects.push(subjLabel);
    }

    if (
      (roleScope === "BOTH" || roleScope === "DELEGATED_ONLY") &&
      rec.delegatedTeacher &&
      (!targetTeacherSet || targetTeacherSet.has(rec.delegatedTeacher.id))
    ) {
      const entry = ensureEntry(rec.delegatedTeacher);
      if (!entry.delegatedByClass.has(rec.classId)) {
        entry.delegatedByClass.set(rec.classId, { className, campusLabel, subjects: [] });
      }
      const clsItem = entry.delegatedByClass.get(rec.classId)!;
      if (!clsItem.subjects.includes(subjLabel)) clsItem.subjects.push(subjLabel);
    }
  }

  let sentCount = 0;
  let failedCount = 0;
  const skippedTeachers: string[] = [];
  const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
  const portalUrl = `${baseUrl}/teacher/so-diem-ctqt`;

  for (const [, bundle] of teacherMap) {
    const { teacher, primaryByClass, delegatedByClass } = bundle;
    if (primaryByClass.size === 0 && delegatedByClass.size === 0) continue;

    const toEmail = resolveTeacherEmail(teacher);
    if (!toEmail) {
      skippedTeachers.push(`${teacher.teacherName} (${teacher.teacherCode || "chưa có email"})`);
      continue;
    }

    const primaryLines = Array.from(primaryByClass.values()).map(
      c => `${c.className}${c.campusLabel ? ` (${c.campusLabel})` : ""}: ${c.subjects.join(", ")}`
    );
    const delegatedLines = Array.from(delegatedByClass.values()).map(
      c => `${c.className}${c.campusLabel ? ` (${c.campusLabel})` : ""}: ${c.subjects.join(", ")}`
    );

    const details: { label: string; value: string; highlight?: boolean }[] = [
      {
        label: "Giáo viên",
        value: `${teacher.teacherName}${teacher.teacherCode ? ` (${teacher.teacherCode})` : ""}`,
        highlight: true,
      },
      {
        label: "Năm học / Học kỳ",
        value: `Năm học ${yearName} — Học kỳ ${semester}`,
      },
    ];

    if (primaryLines.length > 0) {
      details.push({
        label: `GVBM nhập điểm (${primaryLines.length} lớp)`,
        value: primaryLines.join(" | "),
        highlight: true,
      });
    }

    if (delegatedLines.length > 0) {
      details.push({
        label: `GVTA ủy quyền rà soát (${delegatedLines.length} lớp)`,
        value: delegatedLines.join(" | "),
        highlight: true,
      });
    }

    const tableRowsHtml = [
      ...Array.from(primaryByClass.values()).map(
        c => `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${c.className}${c.campusLabel ? ` <span style="font-weight:500;color:#64748B;">(${c.campusLabel})</span>` : ""}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0;"><span style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">GVBM nhập điểm</span></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #334155;">${c.subjects.join(", ")}</td>
          </tr>`
      ),
      ...Array.from(delegatedByClass.values()).map(
        c => `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${c.className}${c.campusLabel ? ` <span style="font-weight:500;color:#64748B;">(${c.campusLabel})</span>` : ""}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0;"><span style="background:#F0FDFA;color:#00736E;border:1px solid #99F6E4;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">GVTA ủy quyền rà soát</span></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #334155;">${c.subjects.join(", ")}</td>
          </tr>`
      ),
    ].join("");

    const customNoteHtml = customMessage?.trim()
      ? `
        <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #92400E; line-height: 1.5;">
          <div style="font-weight: 700; margin-bottom: 4px;">Lưu ý từ Ban Khảo thí &amp; ĐBCL:</div>
          <div>${formatMarkdownToHtml(customMessage.trim())}</div>
        </div>
      `
      : "";

    const scheduleTableHtml = `
      <div style="margin: 16px 0; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
          <thead>
            <tr style="background-color: #F8FAFC; color: #475569;">
              <th style="padding: 9px 10px; border-bottom: 1px solid #E2E8F0;">Lớp học</th>
              <th style="padding: 9px 10px; border-bottom: 1px solid #E2E8F0;">Vai trò phân công</th>
              <th style="padding: 9px 10px; border-bottom: 1px solid #E2E8F0;">Môn học CTQT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
      ${customNoteHtml}
    `;

    const emailHtml = renderSkylineEmail({
      headerBadge: "CHƯƠNG TRÌNH QUỐC TẾ (CTQT)",
      headerTitle: "Thông Báo Phân Công Sổ Điểm & Ủy Quyền GVTA",
      headerSubtitle: "Ban Khảo thí & Đảm bảo chất lượng Sky-Line",
      headerTheme: "teal",
      recipientName: teacher.teacherName,
      greetingPrefix: "Kính gửi Thầy/Cô",
      introMessage: `Ban Khảo thí & Đảm bảo chất lượng (KT&ĐBCL) trân trọng thông báo phân công phụ trách Sổ điểm Chương trình Quốc tế (CTQT) và rà soát nhận xét song ngữ Report Card trong Năm học ${yearName} (Học kỳ ${semester}):`,
      detailsTitle: "TÓM TẮT PHÂN CÔNG & ỦY QUYỀN",
      details,
      extraHtml: scheduleTableHtml,
      noticeBox: {
        type: "info",
        title: "Hướng dẫn thực hiện trên hệ thống",
        content:
          "Thầy/Cô vui lòng đăng nhập phân hệ Sổ điểm CTQT trên Sky-line SMS để nhập điểm, nhận xét bộ môn (đối với GVBM chính) hoặc rà soát, chuẩn hóa câu từ nhận xét tiếng Anh cho học sinh các lớp được ủy quyền (đối với GVTA).",
      },
      button: {
        text: "Truy cập Sổ điểm & Rà soát CTQT",
        url: portalUrl,
        color: "#003B3A",
      },
      secondaryNote:
        "Nếu có thắc mắc hoặc cần điều chỉnh phân công lớp/môn học, Thầy/Cô vui lòng phản hồi về Ban KT&ĐBCL qua email ktdbcl@skylineschool.edu.vn.",
    });

    try {
      const res = await sendEmail({
        to: toEmail,
        subject: `[Sky-line SMS] Thông báo phân công Sổ điểm & GVTA CTQT - HK${semester} (${yearName})`,
        html: emailHtml,
        from: "Ban Khảo thí & ĐBCL Sky-Line <ktdbcl@skylineschool.edu.vn>",
      });
      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      console.error(`[CTQT Assignment Email Error] to ${toEmail}:`, err);
      failedCount++;
    }
  }

  return {
    sentCount,
    failedCount,
    skippedCount: skippedTeachers.length,
    skippedTeachers,
  };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);
    const campusId = searchParams.get("campusId") || "";
    const classId = searchParams.get("classId") || "";

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu academicYearId" }, { status: 400 });
    }

    // Load classes
    const classWhere: any = {
      academicYearId,
      status: "ACTIVE",
    };
    if (campusId) classWhere.campusId = campusId;
    if (classId) classWhere.id = classId;

    let allClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: { className: "asc" },
    });

    // Fallback if classes are not strictly bound to academicYearId
    if (allClasses.length === 0) {
      const fallbackWhere: any = { status: "ACTIVE" };
      if (campusId) fallbackWhere.campusId = campusId;
      if (classId) fallbackWhere.id = classId;
      allClasses = await prisma.class.findMany({
        where: fallbackWhere,
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } },
        },
        orderBy: { className: "asc" },
      });
    }

    // Filter CTQT classes and sort naturally by grade (Khối 1 -> 12)
    const ctqtClasses = allClasses
      .filter(c => isCtqtClass(c.className, c.educationSystem || undefined, c.level, c.grade))
      .sort(compareCtqtClasses);

    const classIds = ctqtClasses.map(c => c.id);

    // Fetch existing assignments
    const assignments = await prisma.ctqtTeachingAssignment.findMany({
      where: {
        academicYearId,
        semester,
        classId: { in: classIds },
      },
      include: {
        primaryTeacher: { select: { id: true, teacherName: true, teacherCode: true } },
        delegatedTeacher: { select: { id: true, teacherName: true, teacherCode: true } },
      },
    });

    // Build assignment matrix per class
    const result = ctqtClasses.map(c => {
      const level = detectCtqtLevel(c.className, c.grade, c.level);
      const config = CTQT_LEVEL_CONFIGS[level];
      const classAssignments = assignments.filter(a => a.classId === c.id);

      const subjects = config.subjects.map(s => {
        const found = classAssignments.find(a => a.subjectCode === s.code);
        return {
          code: s.code,
          nameVi: s.nameVi,
          nameEn: s.nameEn,
          primaryTeacherId: found?.primaryTeacherId || null,
          primaryTeacherName: found?.primaryTeacher?.teacherName || null,
          primaryTeacherCode: found?.primaryTeacher?.teacherCode || null,
          delegatedTeacherId: found?.delegatedTeacherId || null,
          delegatedTeacherName: found?.delegatedTeacher?.teacherName || null,
          delegatedTeacherCode: found?.delegatedTeacher?.teacherCode || null,
          status: found?.status || "DRAFT",
          assignmentId: found?.id || null,
        };
      });

      return {
        classId: c.id,
        className: c.className,
        grade: c.grade || "",
        homeroomTeacherId: c.homeroomTeacherId || null,
        campusName: c.campus?.campusName || "",
        campusCode: c.campus?.campusCode || "",
        campusId: c.campusId,
        level,
        subjects,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error in CTQT assignments GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { action, academicYearId, semester, assignments, sourceSemester, targetSemester } = body;

    // Action: Send email notification to teachers about their CTQT assignments
    if (action === "send_email") {
      if (!academicYearId || !semester) {
        return NextResponse.json(
          { success: false, error: "Thiếu thông tin Năm học hoặc Học kỳ" },
          { status: 400 }
        );
      }

      const semInt = parseInt(String(semester), 10);
      const mailResult = await sendCtqtAssignmentEmails({
        academicYearId,
        semester: semInt,
        teacherIds: Array.isArray(body.teacherIds) ? body.teacherIds : undefined,
        classIds: Array.isArray(body.classIds) ? body.classIds : undefined,
        campusId: body.campusId || undefined,
        roleScope: body.roleScope || "BOTH",
        customMessage: body.customMessage || undefined,
      });

      if (mailResult.sentCount === 0 && mailResult.failedCount === 0 && mailResult.skippedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Không tìm thấy phân công giảng dạy hoặc ủy quyền nào khớp với phạm vi đã chọn để gửi email.",
          },
          { status: 400 }
        );
      }

      const parts: string[] = [];
      if (mailResult.sentCount > 0) {
        parts.push(`Đã gửi email thông báo phân công thành công đến ${mailResult.sentCount} giáo viên`);
      }
      if (mailResult.skippedCount > 0) {
        parts.push(`Bỏ qua ${mailResult.skippedCount} GV chưa có địa chỉ email (${mailResult.skippedTeachers.join(", ")})`);
      }
      if (mailResult.failedCount > 0) {
        parts.push(`${mailResult.failedCount} email gửi lỗi`);
      }

      return NextResponse.json({
        success: mailResult.sentCount > 0 || mailResult.skippedCount > 0,
        ...mailResult,
        message: parts.join(". ") + ".",
      });
    }

    // Action: Clone from source semester to target semester
    if (action === "clone") {
      if (!academicYearId || !sourceSemester || !targetSemester) {
        return NextResponse.json({ success: false, error: "Thiếu thông tin sao chép" }, { status: 400 });
      }

      const sourceAssignments = await prisma.ctqtTeachingAssignment.findMany({
        where: { academicYearId, semester: parseInt(sourceSemester, 10) },
      });

      for (const sa of sourceAssignments) {
        await prisma.ctqtTeachingAssignment.upsert({
          where: {
            academicYearId_semester_classId_subjectCode: {
              academicYearId,
              semester: parseInt(targetSemester, 10),
              classId: sa.classId,
              subjectCode: sa.subjectCode,
            },
          },
          update: {
            primaryTeacherId: sa.primaryTeacherId,
            delegatedTeacherId: sa.delegatedTeacherId,
            status: sa.status,
          },
          create: {
            academicYearId,
            semester: parseInt(targetSemester, 10),
            classId: sa.classId,
            subjectCode: sa.subjectCode,
            primaryTeacherId: sa.primaryTeacherId,
            delegatedTeacherId: sa.delegatedTeacherId,
            status: sa.status,
          },
        });
      }

      return NextResponse.json({ success: true, message: `Đã sao chép thành công ${sourceAssignments.length} phân công sang Học kỳ ${targetSemester}` });
    }

    // Action: Bulk assign 1 or multiple classes & subjects to GVBM and/or GVTA
    if (action === "bulk_assign") {
      const {
        classIds,
        subjectCodes,
        primaryTeacherId,
        delegatedTeacherId,
        updatePrimary,
        updateDelegated,
        clearAssignments,
      } = body;

      if (!academicYearId || !semester || !Array.isArray(classIds) || classIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Vui lòng chọn ít nhất 1 lớp học để phân công" },
          { status: 400 }
        );
      }

      const semInt = parseInt(String(semester), 10);

      // Load selected classes to determine valid subjects per class level
      const selectedClasses = await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, className: true, grade: true, level: true, homeroomTeacherId: true },
      });

      const existingAssignments = await prisma.ctqtTeachingAssignment.findMany({
        where: {
          academicYearId,
          semester: semInt,
          classId: { in: classIds },
        },
      });

      const existingMap = new Map<string, (typeof existingAssignments)[number]>();
      existingAssignments.forEach(a => {
        existingMap.set(`${a.classId}__${a.subjectCode}`, a);
      });

      let updatedCount = 0;
      const notifiedTeacherIds = new Set<string>();

      for (const cls of selectedClasses) {
        const level = detectCtqtLevel(cls.className, cls.grade, cls.level);
        const config = CTQT_LEVEL_CONFIGS[level];
        const validCodes = config.subjects.map(s => s.code);

        const targetCodes =
          !Array.isArray(subjectCodes) || subjectCodes.length === 0 || subjectCodes.includes("ALL")
            ? validCodes
            : subjectCodes.filter((code: string) => validCodes.includes(code));

        for (const subCode of targetCodes) {
          const key = `${cls.id}__${subCode}`;
          const existing = existingMap.get(key);

          if (clearAssignments) {
            if (existing) {
              await prisma.ctqtTeachingAssignment.delete({ where: { id: existing.id } });
              updatedCount++;
            }
            continue;
          }

          let nextPrimary = existing?.primaryTeacherId || null;
          let nextDelegated = existing?.delegatedTeacherId || null;

          if (updatePrimary) {
            if (primaryTeacherId === "__HOMEROOM__") {
              nextPrimary = cls.homeroomTeacherId || nextPrimary;
            } else {
              nextPrimary = primaryTeacherId || null;
            }
          }

          if (updateDelegated) {
            nextDelegated = delegatedTeacherId || null;
          }

          // If neither primary nor delegated teacher is present, remove record if exists
          if (!nextPrimary && !nextDelegated) {
            if (existing) {
              await prisma.ctqtTeachingAssignment.delete({ where: { id: existing.id } });
              updatedCount++;
            }
            continue;
          }

          // Prisma schema requires primaryTeacherId (non-nullable String).
          // If user assigns GVTA (nextDelegated) before assigning GVBM (nextPrimary),
          // use nextDelegated (or class homeroomTeacherId) as primaryTeacherId so delegation is persisted.
          const effectivePrimary = nextPrimary || nextDelegated || cls.homeroomTeacherId;
          if (!effectivePrimary) continue;

          await prisma.ctqtTeachingAssignment.upsert({
            where: {
              academicYearId_semester_classId_subjectCode: {
                academicYearId,
                semester: semInt,
                classId: cls.id,
                subjectCode: subCode,
              },
            },
            update: {
              primaryTeacherId: effectivePrimary,
              delegatedTeacherId: nextDelegated,
            },
            create: {
              academicYearId,
              semester: semInt,
              classId: cls.id,
              subjectCode: subCode,
              primaryTeacherId: effectivePrimary,
              delegatedTeacherId: nextDelegated,
              status: "DRAFT",
            },
          });
          updatedCount++;
          if (updatePrimary && nextPrimary) notifiedTeacherIds.add(nextPrimary);
          if (updateDelegated && nextDelegated) notifiedTeacherIds.add(nextDelegated);
        }
      }

      let emailSummary = "";
      if (!clearAssignments && body.sendNotificationEmail && notifiedTeacherIds.size > 0) {
        const mailResult = await sendCtqtAssignmentEmails({
          academicYearId,
          semester: semInt,
          teacherIds: Array.from(notifiedTeacherIds),
          classIds,
          roleScope:
            updatePrimary && !updateDelegated
              ? "PRIMARY_ONLY"
              : !updatePrimary && updateDelegated
              ? "DELEGATED_ONLY"
              : "BOTH",
        });
        if (mailResult.sentCount > 0) {
          emailSummary = ` Đã gửi email thông báo đến ${mailResult.sentCount} giáo viên.`;
        } else if (mailResult.skippedCount > 0) {
          emailSummary = ` (Chưa gửi được email do ${mailResult.skippedCount} GV chưa có địa chỉ email).`;
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount,
        message: clearAssignments
          ? `Đã gỡ phân công cho ${updatedCount} lượt môn/lớp đã chọn.`
          : `Đã áp dụng phân công thành công cho ${selectedClasses.length} lớp (${updatedCount} lượt môn học).${emailSummary}`,
      });
    }

    // Standard save / update assignments
    if (!Array.isArray(assignments) || !academicYearId || !semester) {
      return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const semInt = parseInt(String(semester), 10);
    const savedTeacherIds = new Set<string>();
    const savedClassIds = new Set<string>();

    for (const item of assignments) {
      const { classId, subjectCode, primaryTeacherId, delegatedTeacherId } = item;
      if (!classId || !subjectCode) continue;

      if (!primaryTeacherId && !delegatedTeacherId) {
        // Delete assignment only when both primary and delegated teachers are cleared
        await prisma.ctqtTeachingAssignment.deleteMany({
          where: {
            academicYearId,
            semester: semInt,
            classId,
            subjectCode,
          },
        });
      } else {
        // If primaryTeacherId is not set yet but delegatedTeacherId is provided,
        // preserve existing primaryTeacherId or fallback to delegatedTeacherId so it can be stored
        let effectivePrimaryId = primaryTeacherId;
        if (!effectivePrimaryId && delegatedTeacherId) {
          const existing = await prisma.ctqtTeachingAssignment.findUnique({
            where: {
              academicYearId_semester_classId_subjectCode: {
                academicYearId,
                semester: semInt,
                classId,
                subjectCode,
              },
            },
            select: { primaryTeacherId: true },
          });
          effectivePrimaryId = existing?.primaryTeacherId || delegatedTeacherId;
        }

        if (!effectivePrimaryId) continue;

        await prisma.ctqtTeachingAssignment.upsert({
          where: {
            academicYearId_semester_classId_subjectCode: {
              academicYearId,
              semester: semInt,
              classId,
              subjectCode,
            },
          },
          update: {
            primaryTeacherId: effectivePrimaryId,
            delegatedTeacherId: delegatedTeacherId || null,
            ...(item.status ? { status: item.status } : {}),
          },
          create: {
            academicYearId,
            semester: semInt,
            classId,
            subjectCode,
            primaryTeacherId: effectivePrimaryId,
            delegatedTeacherId: delegatedTeacherId || null,
            status: item.status || "DRAFT",
          },
        });
        savedClassIds.add(classId);
        if (primaryTeacherId) savedTeacherIds.add(primaryTeacherId);
        if (delegatedTeacherId) savedTeacherIds.add(delegatedTeacherId);
      }
    }

    let stdEmailSummary = "";
    if (body.sendNotificationEmail && savedTeacherIds.size > 0) {
      const mailResult = await sendCtqtAssignmentEmails({
        academicYearId,
        semester: semInt,
        teacherIds: Array.from(savedTeacherIds),
        classIds: Array.from(savedClassIds),
        roleScope: "BOTH",
      });
      if (mailResult.sentCount > 0) {
        stdEmailSummary = ` Đã gửi email thông báo đến ${mailResult.sentCount} giáo viên.`;
      } else if (mailResult.skippedCount > 0) {
        stdEmailSummary = ` (Chưa gửi được email do ${mailResult.skippedCount} GV chưa có địa chỉ email).`;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cập nhật phân công giảng dạy & ủy quyền thành công.${stdEmailSummary}`,
    });
  } catch (error: any) {
    console.error("Error in CTQT assignments POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
