// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isOfficiallyApprovedConclusion } from "@/lib/entrance-progress/constants";

function normalizeEmailAddr(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn")
    .toLowerCase();
  if (!cleaned.includes("@") || cleaned.includes(" ") || cleaned.length <= 5) return "";
  return cleaned;
}

function addEmailToSet(targetSet: Set<string>, raw?: string | null) {
  const norm = normalizeEmailAddr(raw);
  if (norm && norm !== "admin@skyline.edu") {
    targetSet.add(norm);
  }
}

function extractCampusCodeFromText(raw?: string | null): string {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "";
  if (s.includes("CS1") || s.includes("RIVERSIDE") || s.includes("CƠ SỞ 1") || s.includes("CO SO 1")) return "CS1";
  if (s.includes("CS2") || s.includes("CENTRAL") || s.includes("CƠ SỞ 2") || s.includes("CO SO 2")) return "CS2";
  if (s.includes("CS3") || s.includes("GLOBAL") || s.includes("INTERNATIONAL") || s.includes("CƠ SỞ 3") || s.includes("CO SO 3")) return "CS3";
  if (s.includes("CS4") || s.includes("HILL") || s.includes("CƠ SỞ 4") || s.includes("CO SO 4")) return "CS4";
  if (s.includes("CS5") || s.includes("BEACH") || s.includes("CƠ SỞ 5") || s.includes("CO SO 5")) return "CS5";
  return "";
}

function formatStudentScoreSummaryHtml(s: any): string {
  if (s.detailedScoresText) return s.detailedScoresText;
  if (!Array.isArray(s.scores) || s.scores.length === 0) return "—";

  const lines: string[] = [];
  for (const sc of s.scores) {
    const sub = sc?.subject || {};
    const subName = String(sub.name || sc.subjectName || "Môn").trim();
    const sNameLower = subName.toLowerCase().normalize("NFC");
    const sCode = String(sub.code || "").toLowerCase();

    if (sCode.includes("pdh") || sCode.includes("orientation") || sNameLower.includes("định hướng")) {
      lines.push(`<b>Phiếu định hướng:</b> Đã cập nhật`);
      continue;
    }

    let vArr: any[] = [];
    try {
      const parsed = Array.isArray(sc.scores) ? sc.scores : JSON.parse(sc.scores || "[]");
      vArr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      vArr = sc.scores ? [sc.scores] : [];
    }

    if (sCode.includes("tci") || sCode.includes("cpt") || sNameLower.includes("chuẩn phát triển")) {
      let tciMeta: any = null;
      if (sc.comments) {
        try {
          const pc = JSON.parse(sc.comments);
          const cArr = Array.isArray(pc) ? pc : [pc];
          for (const item of cArr) {
            if (typeof item === "string" && item.includes('"_tciMeta"')) {
              const m = JSON.parse(item);
              if (m?._tciMeta) tciMeta = m._tciMeta;
            }
          }
        } catch {}
      }
      const passed = tciMeta?.countDat ?? vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
      const total = vArr.length > 0 ? vArr.length : 16;
      lines.push(`<b>${subName}:</b> ${passed}/${total} Đạt`);
      continue;
    }

    if (sCode.includes("tly") || sNameLower.includes("tâm lý")) {
      const scNum = parseFloat(vArr[6] ?? vArr[20] ?? vArr[0] ?? "0");
      if (!isNaN(scNum)) {
        const lvl = scNum <= 15 ? "Bình thường" : scNum <= 31 ? "Dấu hiệu nhẹ" : scNum <= 47 ? "Dấu hiệu vừa" : "Nguy cơ cao";
        lines.push(`<b>${subName}:</b> ${lvl} (${scNum}đ)`);
      } else {
        lines.push(`<b>${subName}:</b> Đã khảo sát`);
      }
      continue;
    }

    if (sCode.includes("nltd") || sNameLower.includes("năng lực tư duy")) {
      const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
      if (pctVal !== undefined && pctVal !== null && String(pctVal).trim() !== "") {
        lines.push(`<b>${subName}:</b> ${pctVal}%`);
      }
      continue;
    }

    const nonEmpty = vArr.filter(x => x !== undefined && x !== null && String(x).trim() !== "");
    if (nonEmpty.length > 0) {
      lines.push(`<b>${subName}:</b> ${nonEmpty[0]}`);
    }
  }

  return lines.length > 0 ? lines.join("<br/>") : "—";
}

function cleanDirectorNoteForEmail(rawNote?: string | null): string {
  if (!rawNote || typeof rawNote !== "string") return "—";
  const withoutHistory = rawNote
    .replace(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---[\s\S]*$/i, "")
    .trim();
  if (!withoutHistory) return "—";
  return withoutHistory.replace(/\r?\n/g, "<br/>");
}

function extractCommitmentSubjectsAndNote(s: any): { committedSubjects: string[]; remainingNoteHtml: string } {
  const rawNote = String(s?.directorNote || s?.notes || s?.comment || "");
  let cleanText = rawNote
    .replace(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---[\s\S]*$/i, "")
    .trim();

  const subjects: string[] = [];
  const pushSubjects = (items: string[]) => {
    for (const item of items) {
      const trimmed = String(item || "").trim();
      if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed.toLowerCase() === "không") continue;
      if (!subjects.includes(trimmed)) {
        subjects.push(trimmed);
      }
    }
  };

  // 1. Ưu tiên đọc từ trường tường minh nếu payload truyền lên
  const explicitField = s?.committedSubjects ?? s?.commitmentSubjects;
  if (Array.isArray(explicitField)) {
    pushSubjects(explicitField);
  } else if (typeof explicitField === "string" && explicitField.trim()) {
    pushSubjects(explicitField.split(/[,;]/));
  }

  // 2. Trích xuất từ dòng "Môn cam kết: [...]" hoặc "[Môn cam kết: ...]" trong directorNote và loại bỏ khỏi ghi chú tránh lặp lại
  const commitRegex = /(?:^|\r?\n)\s*\[?\s*(?:Môn cam kết|Mon cam ket):\s*\[?([^\]\r\n]+)\]?\s*\]?(?:\r?\n)*/i;
  const match = cleanText.match(commitRegex);
  if (match && match[1]) {
    pushSubjects(match[1].split(/[,;]/));
    cleanText = cleanText.replace(commitRegex, "\n").trim();
  }

  const remainingNoteHtml = cleanText ? cleanText.replace(/\r?\n/g, "<br/>") : "—";
  return {
    committedSubjects: subjects,
    remainingNoteHtml
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      periodId,
      periodName,
      batchId,
      batchName,
      campusId,
      campusName,
      students,
      isPreschool,
      approverName,
      approverRole,
      previewOnly
    } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu học sinh để thông báo" }, { status: 400 });
    }

    const currentUserName = approverName || session.user.name || "Giám đốc Cơ sở";
    const currentUserEmail = session.user.email;

    // 1. Tải danh sách Cơ sở & thông tin Đợt khảo sát để định tuyến chính xác
    const allCampuses = await prisma.campus.findMany({
      include: {
        manager: {
          include: { teacher: true }
        }
      }
    }).catch(() => []);

    let batchRecord: any = null;
    if (batchId && batchId !== "all") {
      try {
        if (isPreschool) {
          batchRecord = await (prisma as any).preschoolInputAssessmentBatch.findUnique({
            where: { id: batchId }
          });
        } else {
          batchRecord = await (prisma as any).inputAssessmentBatch.findUnique({
            where: { id: batchId }
          });
        }
      } catch {}
    }

    const targetCampusCodes = new Set<string>();
    const targetCampusIds = new Set<string>();

    const registerCampusMatch = (cObj: any) => {
      if (!cObj) return;
      if (cObj.id) targetCampusIds.add(cObj.id);
      if (cObj.campusCode) targetCampusCodes.add(String(cObj.campusCode).toUpperCase().trim());
    };

    const resolveAndRegisterByRef = (ref?: string | null) => {
      if (!ref || ref === "all") return;
      const trimmed = String(ref).trim();
      const byIdOrExact = allCampuses.find(
        (c: any) =>
          c.id === trimmed ||
          String(c.campusCode || "").toUpperCase() === trimmed.toUpperCase() ||
          String(c.campusName || "").toUpperCase() === trimmed.toUpperCase()
      );
      if (byIdOrExact) {
        registerCampusMatch(byIdOrExact);
        return;
      }
      const extractedCode = extractCampusCodeFromText(trimmed);
      if (extractedCode) {
        targetCampusCodes.add(extractedCode);
        const byCode = allCampuses.find((c: any) => String(c.campusCode || "").toUpperCase() === extractedCode);
        if (byCode) registerCampusMatch(byCode);
      }
    };

    resolveAndRegisterByRef(campusId);
    resolveAndRegisterByRef(campusName);
    if (batchRecord?.campusId) resolveAndRegisterByRef(batchRecord.campusId);
    if (batchRecord?.name) resolveAndRegisterByRef(batchRecord.name);
    resolveAndRegisterByRef(batchName);

    for (const s of students) {
      resolveAndRegisterByRef(s?.admissionCampus);
      resolveAndRegisterByRef(s?.registeredCampus);
      resolveAndRegisterByRef(s?.campusId);
      resolveAndRegisterByRef(s?.batch?.name);
    }

    // Nếu vẫn chưa xác định được cơ sở nào, mặc định CS1
    if (targetCampusCodes.size === 0 && allCampuses.length > 0) {
      const cs1 = allCampuses.find((c: any) => String(c.campusCode || "").toUpperCase() === "CS1") || allCampuses[0];
      registerCampusMatch(cs1);
    }

    const resolvedCampuses = allCampuses.filter(
      (c: any) => targetCampusIds.has(c.id) || targetCampusCodes.has(String(c.campusCode || "").toUpperCase())
    );
    const campusCodesList = Array.from(targetCampusCodes);
    const primaryCampus = resolvedCampuses[0] || null;
    const finalCampusName =
      resolvedCampuses.length > 1
        ? resolvedCampuses.map((c: any) => c.campusName || c.campusCode).join(", ")
        : primaryCampus?.campusName ||
          (campusName && campusName !== "all" ? campusName : "") ||
          (campusCodesList[0] ? `Cơ sở ${campusCodesList[0]}` : "Hệ thống Giáo dục Sky-Line");

    // 2. Đọc cấu hình định tuyến email từ AssessmentConfig (hoặc từ body.emailConfig)
    let savedEmailCfg: any = body?.emailConfig || null;
    if (!savedEmailCfg) {
      try {
        const cfgRow = await prisma.assessmentConfig.findFirst({
          where: {
            categoryType: "APPROVAL_EMAIL_CONFIG",
            code: "EMAIL_ROUTING_V1"
          },
          orderBy: { updatedAt: "desc" }
        });
        if (cfgRow?.name) {
          savedEmailCfg = JSON.parse(cfgRow.name);
        }
      } catch (cfgErr) {
        console.warn("Could not load APPROVAL_EMAIL_CONFIG:", cfgErr);
      }
    }

    const autoMergeDbStaff = savedEmailCfg?.autoMergeDbStaff !== false;
    const groupCfg = {
      gdcs: {
        enabled: savedEmailCfg?.groups?.gdcs?.enabled !== false,
        target: savedEmailCfg?.groups?.gdcs?.target === "cc" ? "cc" : "to"
      },
      tuvan: {
        enabled: savedEmailCfg?.groups?.tuvan?.enabled !== false,
        target: savedEmailCfg?.groups?.tuvan?.target === "cc" ? "cc" : "to"
      },
      giaovu: {
        enabled: savedEmailCfg?.groups?.giaovu?.enabled !== false,
        target: savedEmailCfg?.groups?.giaovu?.target === "cc" ? "cc" : "to"
      },
      ktdbcl: {
        enabled: savedEmailCfg?.groups?.ktdbcl?.enabled !== false,
        target: savedEmailCfg?.groups?.ktdbcl?.target === "to" ? "to" : "cc"
      }
    };

    // Thu thập danh sách email 4 nhóm: GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở và Ban KT&ĐBCL
    const gdcsEmails = new Set<string>();
    const tuvanEmails = new Set<string>();
    const giaovuEmails = new Set<string>();
    const ktdbclEmails = new Set<string>();

    if (autoMergeDbStaff) {
      // Tải bảng ánh xạ teacherCode -> email để giải quyết trường hợp User.email lưu mã nhân sự (0201...)
      const allActiveTeachers = await prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        include: {
          departmentRel: true,
          campus: true,
          user: { select: { id: true, email: true, role: true } }
        }
      }).catch(() => []);

      const teacherByCode = new Map<string, any>();
      const teacherByUserId = new Map<string, any>();
      for (const t of allActiveTeachers) {
        if (t.teacherCode) teacherByCode.set(String(t.teacherCode).trim(), t);
        if (t.userId) teacherByUserId.set(String(t.userId).trim(), t);
      }

      const resolveUserActualEmail = (u: any): string => {
        if (!u) return "";
        if (u.teacher?.email && u.teacher.email.includes("@")) return u.teacher.email;
        const byUid = u.id ? teacherByUserId.get(String(u.id)) : null;
        if (byUid?.email && byUid.email.includes("@")) return byUid.email;
        const byCode = u.email ? teacherByCode.get(String(u.email).trim()) : null;
        if (byCode?.email && byCode.email.includes("@")) return byCode.email;
        if (u.email && u.email.includes("@")) return u.email;
        return "";
      };

      // --- A. Giám đốc Cơ sở (GĐCS) ---
      for (const cObj of resolvedCampuses) {
        addEmailToSet(gdcsEmails, cObj.manager?.teacher?.email);
        addEmailToSet(gdcsEmails, resolveUserActualEmail(cObj.manager));
      }

      // --- B & C & A từ UserCampusAssignment (GĐCS, Giáo vụ Cơ sở, Tư vấn Cơ sở được phân công phụ trách cơ sở) ---
      if (targetCampusIds.size > 0) {
        try {
          const campusAssignments = await prisma.userCampusAssignment.findMany({
            where: { campusId: { in: Array.from(targetCampusIds) } },
            include: { user: { include: { teacher: true } } }
          });
          for (const a of campusAssignments) {
            const u = a.user;
            if (!u) continue;
            const role = String(u.role || "").toUpperCase().trim();
            const actualEmail = resolveUserActualEmail(u);
            if (!actualEmail) continue;

            if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(role)) {
              addEmailToSet(gdcsEmails, actualEmail);
            } else if (["GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS"].includes(role)) {
              addEmailToSet(giaovuEmails, actualEmail);
            } else if (["TVAN", "TU_VAN", "TUYEN_SINH", "TVTS"].includes(role)) {
              addEmailToSet(tuvanEmails, actualEmail);
            }
          }
        } catch (assignErr) {
          console.warn("Error fetching campus assignments for email:", assignErr);
        }
      }

      // --- Tra cứu từ danh sách Giáo viên/Nhân sự hoạt động tại cơ sở (GĐCS, Giáo vụ, Tư vấn) ---
      for (const t of allActiveTeachers) {
        const tCampusCode = String(t.campus?.campusCode || "").toUpperCase().trim();
        const isTargetCampus =
          (t.campusId && targetCampusIds.has(t.campusId)) ||
          (tCampusCode && targetCampusCodes.has(tCampusCode));
        if (!isTargetCampus) continue;

        const deptCode = String(t.departmentRel?.code || "").toUpperCase().trim();
        const deptName = String(t.departmentRel?.name || "").toLowerCase().normalize("NFC");
        const userRole = String(t.user?.role || "").toUpperCase().trim();
        const tEmail = t.email || (t.user?.email?.includes("@") ? t.user.email : "");
        if (!tEmail) continue;

        if (
          ["GĐ_CS", "GD_CS", "GDCS", "GĐCS"].includes(deptCode) ||
          deptName.includes("giám đốc cơ sở") ||
          deptName === "gđcs" ||
          ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(userRole)
        ) {
          addEmailToSet(gdcsEmails, tEmail);
        }

        if (
          deptCode.includes("GVU") ||
          deptCode.includes("GIAOVU") ||
          deptCode.includes("GIAO_VU") ||
          deptName.includes("giáo vụ") ||
          ["GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS"].includes(userRole)
        ) {
          addEmailToSet(giaovuEmails, tEmail);
        }

        if (
          ["TVAN", "TUVAN", "TUYENSINH", "TVTS"].includes(deptCode) ||
          deptName.includes("tư vấn") ||
          deptName.includes("tuyển sinh") ||
          ["TVAN", "TU_VAN", "TUYEN_SINH", "TVTS"].includes(userRole)
        ) {
          addEmailToSet(tuvanEmails, tEmail);
        }
      }

      // Nếu đợt khảo sát có gán Người phụ trách (thường là Giáo vụ cơ sở)
      if (batchRecord?.assignedUserId) {
        try {
          const batchAssignee = await prisma.user.findUnique({
            where: { id: batchRecord.assignedUserId },
            include: { teacher: true }
          });
          if (batchAssignee) {
            addEmailToSet(giaovuEmails, resolveUserActualEmail(batchAssignee));
          }
        } catch {}
      }

      // Nếu người đang đăng nhập duyệt là GĐCS
      try {
        const userRole = String((session?.user as any)?.role || "").toUpperCase();
        if (userRole.includes("GD") || userRole.includes("GĐ")) {
          const curTeacher = teacherByUserId.get(String((session.user as any).id));
          addEmailToSet(gdcsEmails, curTeacher?.email);
          addEmailToSet(gdcsEmails, currentUserEmail);
        }
      } catch {}
    }

    // --- Danh bạ chuẩn / Cấu hình theo từng Cơ sở Sky-Line (chỉ giữ email nhân sự thực tế, loại bỏ alias ảo gdcs.cs*@ / tuyensinh.cs*@ / giaovu.cs*@ / bankhaothi@) ---
    const isPlaceholderAliasEmail = (em: string) => {
      const lower = String(em || "").trim().toLowerCase();
      return (
        /^(gdcs|tuyensinh|giaovu)\.cs\d+@skylineschool\.edu\.vn$/.test(lower) ||
        lower === "bankhaothi@skylineschool.edu.vn"
      );
    };

    const officialGdcsMap: Record<string, string[]> = {
      CS1: ["longtt@skylineschool.edu.vn"],
      CS2: ["khanhpt@skylineschool.edu.vn"],
      CS3: ["thanhtt@skylineschool.edu.vn"],
      CS4: ["trungct@skylineschool.edu.vn"],
      CS5: ["trungdq1@skylineschool.edu.vn"],
    };

    const officialTuvanMap: Record<string, string[]> = {
      CS1: ["thuongttn@skylineschool.edu.vn"],
      CS2: [
        "hoaipt@skylineschool.edu.vn",
        "dinhnth@skylineschool.edu.vn",
        "doanhtt@skylineschool.edu.vn",
        "huyennt@skylineschool.edu.vn",
      ],
      CS3: [
        "thungatt@skylineschool.edu.vn",
        "hapvy@skylineschool.edu.vn",
      ],
      CS4: [
        "senttt@skylineschool.edu.vn",
        "anhntm@skylineschool.edu.vn",
      ],
      CS5: [
        "linhnmh@skylineschool.edu.vn",
        "quyenttx@skylineschool.edu.vn",
      ],
    };

    const officialGiaovuMap: Record<string, string[]> = {
      CS1: ["phuongvt@skylineschool.edu.vn", "thuda@skylineschool.edu.vn"],
      CS2: ["thuda@skylineschool.edu.vn", "dunglp@skylineschool.edu.vn"],
      CS3: ["thuda@skylineschool.edu.vn"],
      CS4: ["bichtramtt@skylineschool.edu.vn"],
      CS5: ["dunglp@skylineschool.edu.vn"],
    };

    for (const csCode of campusCodesList) {
      const customCampusCfg = savedEmailCfg?.campuses?.[csCode];
      const gdcsList = Array.isArray(customCampusCfg?.gdcs) ? customCampusCfg.gdcs : (officialGdcsMap[csCode] || []);
      const tuvanList = Array.isArray(customCampusCfg?.tuvan) ? customCampusCfg.tuvan : (officialTuvanMap[csCode] || []);
      const giaovuList = Array.isArray(customCampusCfg?.giaovu) ? customCampusCfg.giaovu : (officialGiaovuMap[csCode] || []);

      gdcsList.forEach((e: string) => !isPlaceholderAliasEmail(e) && addEmailToSet(gdcsEmails, e));
      tuvanList.forEach((e: string) => !isPlaceholderAliasEmail(e) && addEmailToSet(tuvanEmails, e));
      giaovuList.forEach((e: string) => !isPlaceholderAliasEmail(e) && addEmailToSet(giaovuEmails, e));
    }

    // --- D. Ban Kiểm tra & Đảm bảo Chất lượng (Ban KT&ĐBCL) ---
    const configuredKtdbclList = Array.isArray(savedEmailCfg?.ktdbclEmails)
      ? savedEmailCfg.ktdbclEmails
      : ["thangdx@skylineschool.edu.vn", "ktdbcl@skylineschool.edu.vn"];
    configuredKtdbclList.forEach((e: string) => !isPlaceholderAliasEmail(e) && addEmailToSet(ktdbclEmails, e));

    // Lọc sạch mọi alias ảo nếu lỡ tồn tại trong DB / cấu hình cũ
    for (const grp of [gdcsEmails, tuvanEmails, giaovuEmails, ktdbclEmails]) {
      for (const em of Array.from(grp)) {
        if (isPlaceholderAliasEmail(em)) grp.delete(em);
      }
    }

    // Áp dụng cấu hình bật/tắt nhóm người nhận và phân bổ To / CC
    if (!groupCfg.gdcs.enabled) gdcsEmails.clear();
    if (!groupCfg.tuvan.enabled) tuvanEmails.clear();
    if (!groupCfg.giaovu.enabled) giaovuEmails.clear();
    if (!groupCfg.ktdbcl.enabled) ktdbclEmails.clear();

    const toEmails = new Set<string>();
    const ccEmails = new Set<string>();

    const routeGroupSet = (groupSet: Set<string>, target: "to" | "cc") => {
      for (const em of groupSet) {
        if (target === "to") toEmails.add(em);
        else ccEmails.add(em);
      }
    };

    if (groupCfg.gdcs.enabled) routeGroupSet(gdcsEmails, groupCfg.gdcs.target);
    if (groupCfg.tuvan.enabled) routeGroupSet(tuvanEmails, groupCfg.tuvan.target);
    if (groupCfg.giaovu.enabled) routeGroupSet(giaovuEmails, groupCfg.giaovu.target);
    if (groupCfg.ktdbcl.enabled) routeGroupSet(ktdbclEmails, groupCfg.ktdbcl.target);

    // Không để trùng lặp email giữa To và CC
    for (const em of toEmails) {
      ccEmails.delete(em);
    }

    // Fallback an toàn nếu chưa có email nào ở To (chuyển từ CC sang hoặc dùng fallback)
    if (toEmails.size === 0 && ccEmails.size > 0) {
      for (const em of ccEmails) toEmails.add(em);
      ccEmails.clear();
    }
    if (toEmails.size === 0) {
      const fb = normalizeEmailAddr(currentUserEmail) || "ktdbcl@skylineschool.edu.vn";
      toEmails.add(fb);
    }

    // 3. Thống kê số lượng kết quả
    const totalCount = students.length;
    let passedCount = 0;
    let committedCount = 0;
    let failedCount = 0;
    let absentCount = 0;
    let pendingCount = 0;

    students.forEach(s => {
      const res = String(s.admissionResult || "").trim().toLowerCase();
      if (s.isAbsent) {
        absentCount++;
      } else if (res.includes("cam kết")) {
        committedCount++;
      } else if (res.includes("không đạt")) {
        failedCount++;
      } else if (res.includes("đạt") || res.includes("miễn") || res.includes("học thử")) {
        passedCount++;
      } else {
        pendingCount++;
      }
    });

    const nowFormatted = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(new Date());

    const finalPeriodName = periodName || "Kỳ Khảo sát Tuyển sinh";
    const finalBatchName = batchName || batchRecord?.name || "Đợt khảo sát";

    const emailSubject = `[Sky-line SMS - Xét Duyệt] Thông báo Kết quả Xét duyệt: ${finalBatchName} - ${finalCampusName}`;

    const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    // 4. Xây dựng Bảng HTML 10 cột chuẩn Sổ cái Học thuật Sky-Line (không hiển thị cột Thao tác, bổ sung cột Môn cam kết):
    // Mã HS | Học sinh | Ngày sinh | Giới tính | Khối | Hệ | Cơ sở | Kết quả khảo sát | Môn cam kết | KQ đã xét duyệt
    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth
        ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN")
        : (s.dob || "—");

      const gender = s.gender ? (s.gender === "FEMALE" || s.gender === "Nữ" || s.gender === "F" ? "Nữ" : "Nam") : "—";
      const grade = s.grade
        ? (isPreschool ? s.grade : (String(s.grade).toLowerCase().startsWith("khối") ? s.grade : `Khối ${s.grade}`))
        : (s.className || "—");
      const system = s.surveyFormType || s.surveySystem || "—";
      const rowCampusCode =
        extractCampusCodeFromText(s.admissionCampus) ||
        extractCampusCodeFromText(s.registeredCampus) ||
        extractCampusCodeFromText(s.batch?.name) ||
        campusCodesList[0] ||
        finalCampusName;

      const rawRes = (s.admissionResult || "").trim();
      let badgeBg = "#FFFBEB";
      let badgeColor = "#D97706";
      let badgeBorder = "#FDE68A";
      let statusLabel = rawRes || "Chờ duyệt";

      if (s.isAbsent) {
        badgeBg = "#F1F5F9";
        badgeColor = "#64748B";
        badgeBorder = "#CBD5E1";
        statusLabel = "Vắng khảo sát";
      } else if (rawRes.toLowerCase().includes("cam kết")) {
        badgeBg = "#FEF3C7";
        badgeColor = "#D97706";
        badgeBorder = "#FCD34D";
        statusLabel = rawRes || "Đạt cam kết";
      } else if (rawRes.toLowerCase().includes("không đạt")) {
        badgeBg = "#FEE2E2";
        badgeColor = "#E11D48";
        badgeBorder = "#FCA5A5";
        statusLabel = rawRes || "Không đạt";
      } else if (rawRes.toLowerCase().includes("đạt") || rawRes.toLowerCase().includes("học thử") || rawRes.toLowerCase().includes("miễn")) {
        badgeBg = "#D1FAE5";
        badgeColor = "#059669";
        badgeBorder = "#6EE7B7";
        statusLabel = rawRes === "Đạt" ? "Đạt chuẩn" : (rawRes || "Đạt chuẩn");
      }

      const scoreDetailHtml = formatStudentScoreSummaryHtml(s);
      const { committedSubjects, remainingNoteHtml } = extractCommitmentSubjectsAndNote(s);
      const committedSubjectsHtml =
        committedSubjects.length > 0
          ? committedSubjects
              .map(
                (subj) =>
                  `<span style="display: inline-block; padding: 2px 7px; margin: 2px 3px 2px 0; font-size: 10.5px; font-weight: 700; color: #B45309; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 5px; line-height: 1.35;">${subj}</span>`
              )
              .join("")
          : `<span style="font-size: 11.5px; color: #64748B; font-weight: 500;">Không</span>`;
      const studentBatchLabel = s.batch?.name || finalBatchName;

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <!-- 1. Mã HS -->
          <td style="padding: 10px 7px; text-align: left; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Mã HS:</span>
            <span class="mobile-val">
              <span style="font-size: 11px; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 700; color: #003B3A; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 6px; border-radius: 5px;">
                ${s.studentCode || "—"}
              </span>
            </span>
          </td>
          <!-- 2. Học sinh -->
          <td style="padding: 10px 8px; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Học sinh:</span>
            <span class="mobile-val">
              <div style="font-size: 12.5px; font-weight: 800; color: #0F172A; line-height: 1.35;">${s.fullName || "—"}</div>
              <div style="margin-top: 2px; font-size: 10px; color: #00736E; font-weight: 600; line-height: 1.35;">
                ${studentBatchLabel}
              </div>
            </span>
          </td>
          <!-- 3. Ngày sinh -->
          <td style="padding: 10px 6px; font-size: 11.5px; color: #475569; text-align: center; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Ngày sinh:</span>
            <span class="mobile-val">${dob}</span>
          </td>
          <!-- 4. Giới tính -->
          <td style="padding: 10px 6px; font-size: 11.5px; color: #475569; text-align: center; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Giới tính:</span>
            <span class="mobile-val">${gender}</span>
          </td>
          <!-- 5. Khối -->
          <td style="padding: 10px 6px; font-size: 11.5px; font-weight: 700; color: #003B3A; text-align: center; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Khối:</span>
            <span class="mobile-val">${grade}</span>
          </td>
          <!-- 6. Hệ -->
          <td style="padding: 10px 6px; font-size: 11.5px; font-weight: 600; color: #334155; text-align: center; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Hệ:</span>
            <span class="mobile-val">${system}</span>
          </td>
          <!-- 7. Cơ sở -->
          <td style="padding: 10px 6px; text-align: center; white-space: nowrap; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Cơ sở:</span>
            <span class="mobile-val">
              <span style="display: inline-block; padding: 2px 7px; font-size: 10.5px; font-weight: 700; color: #00736E; background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 5px;">
                ${rowCampusCode}
              </span>
            </span>
          </td>
          <!-- 8. Kết quả khảo sát -->
          <td style="padding: 10px 8px; font-size: 11.5px; color: #334155; line-height: 1.5; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Kết quả khảo sát:</span>
            <span class="mobile-val">${scoreDetailHtml}</span>
          </td>
          <!-- 9. Môn cam kết -->
          <td style="padding: 10px 8px; text-align: left; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">Môn cam kết:</span>
            <span class="mobile-val">${committedSubjectsHtml}</span>
          </td>
          <!-- 10. KQ đã xét duyệt -->
          <td style="padding: 10px 8px; text-align: center; vertical-align: middle;">
            <span class="mobile-label" style="display: none; mso-hide: all;">KQ đã xét duyệt:</span>
            <span class="mobile-val">
              <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; white-space: nowrap;">
                ${statusLabel}
              </span>
              ${remainingNoteHtml && remainingNoteHtml !== "—" ? `
                <div style="margin-top: 4px; font-size: 10.5px; color: #475569; font-style: italic; line-height: 1.35;">
                  ${remainingNoteHtml}
                </div>
              ` : ""}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    // 5. HTML Email chuẩn Sky-Line Academic Ledger, Responsive trên Desktop/Mobile & tương thích Microsoft Outlook
    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thông báo Kết quả Xét duyệt Khảo sát Tuyển sinh - Hệ thống Giáo dục Sky-Line</title>
  <style type="text/css">
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    .mobile-label { display: none; }
    @media only screen and (max-width: 680px) {
      .outer-wrap { padding: 8px 4px !important; }
      .main-card { border-radius: 10px !important; }
      .header-pad { padding: 20px 16px !important; }
      .email-title { font-size: 17px !important; line-height: 1.35 !important; }
      .section-pad { padding: 18px 16px !important; }
      .table-title-pad { padding: 18px 16px 10px 16px !important; }
      .table-pad { padding: 0 12px 18px 12px !important; }
      .footer-pad { padding: 18px 14px !important; }
      .kpi-row { display: block !important; font-size: 0 !important; }
      .kpi-cell { display: inline-block !important; width: 50% !important; box-sizing: border-box !important; vertical-align: top !important; }
      .table-scroll { border: none !important; border-radius: 0 !important; overflow: visible !important; }
      .responsive-table, .responsive-table tbody { display: block !important; width: 100% !important; min-width: 0 !important; }
      .responsive-table thead { display: none !important; }
      .responsive-table tr {
        display: block !important;
        margin-bottom: 12px !important;
        border: 1px solid #CBD5E1 !important;
        border-radius: 10px !important;
        background-color: #FFFFFF !important;
        padding: 8px 12px !important;
      }
      .responsive-table td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 6px 0 !important;
        text-align: left !important;
        white-space: normal !important;
        border-bottom: 1px solid #F1F5F9 !important;
      }
      .responsive-table td:last-child { border-bottom: none !important; }
      .mobile-label {
        display: inline-block !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        color: #64748B !important;
        width: 112px !important;
        margin-right: 6px !important;
        vertical-align: top !important;
      }
      .mobile-val {
        display: inline-block !important;
        width: calc(100% - 122px) !important;
        vertical-align: top !important;
      }
      .cta-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        padding: 12px 16px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, p, a, div, span { font-family: Arial, Helvetica, sans-serif !important; }
    .mobile-label { display: none !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #1E293B;">
  
  <!-- Preheader text -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF; opacity: 0;">
    Thông báo Kết quả Xét duyệt Khảo sát Tuyển sinh Sky-Line: ${finalBatchName} - ${finalCampusName}. Kết quả: ${passedCount + committedCount}/${totalCount} Đạt.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F1F5F9" class="outer-wrap" style="background-color: #F1F5F9; padding: 20px 10px; min-width: 100%;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" class="main-card" style="max-width: 980px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 59, 58, 0.08); border: 1px solid #CBD5E1;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td bgcolor="#003B3A" class="header-pad" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #064E3B 50%, #007A87 100%); padding: 26px 32px; text-align: left; border-bottom: 4px solid #00A19A;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                <tr>
                  <td bgcolor="#064E3B" style="background-color: #064E3B; border: 1px solid #00A19A; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 800; color: #5EEAD4; letter-spacing: 0.8px; text-transform: uppercase;">
                    <img src="${baseUrl}/logo.png" alt="Sky-Line" height="18" style="height: 18px; width: auto; vertical-align: middle; margin-right: 6px; display: inline-block;" />
                    <span style="vertical-align: middle;">HỆ THỐNG GIÁO DỤC SKY-LINE &bull; QUẢN LÝ KHẢO SÁT &amp; XÉT TUYỂN</span>
                  </td>
                </tr>
              </table>
              <h1 class="email-title" style="margin: 0; font-size: 21px; font-weight: 900; color: #FFFFFF; line-height: 1.35; letter-spacing: 0.4px; text-transform: uppercase;">
                THÔNG BÁO KẾT QUẢ XÉT DUYỆT KHẢO SÁT ĐẦU VÀO
              </h1>
              <div style="margin-top: 8px; font-size: 13px; color: #CCFBF1; font-weight: 500; line-height: 1.5;">
                Đợt: <strong style="color: #FDE047;">${finalBatchName}</strong> &bull; Cơ sở: <strong style="color: #FFFFFF;">${finalCampusName}</strong>
              </div>
            </td>
          </tr>

          <!-- APPROVER & CONTEXT INFO CARD -->
          <tr>
            <td class="section-pad" style="padding: 22px 28px 18px 28px; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
              <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                <div style="margin-bottom: 8px;">
                  <strong style="color: #003B3A;">Kính gửi:</strong> Giám đốc Cơ sở, Bộ phận Tư vấn Tuyển sinh Cơ sở, Bộ phận Giáo vụ Cơ sở và Ban KT&amp;ĐBCL,
                </div>
                <div>
                  <strong style="color: #003B3A;">Hội đồng Tuyển sinh ${finalCampusName}</strong> đã hoàn tất xét duyệt kết quả khảo sát đầu vào cho học sinh thuộc <strong style="color: #003B3A;">${finalBatchName}</strong> (${finalPeriodName}) vào lúc <strong>${nowFormatted}</strong>.
                </div>
              </div>

              <!-- KPI SUMMARY METRICS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="tabular-nums" style="margin-top: 16px;">
                <tr class="kpi-row">
                  <td width="${absentCount > 0 ? '20%' : '25%'}" align="center" class="kpi-cell" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#F0FDFA" align="center" style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 700; color: #0F766E;">Tổng hồ sơ</div>
                          <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin-top: 3px;">${totalCount}</div>
                          <div style="font-size: 10.5px; color: #007A87; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '25%'}" align="center" class="kpi-cell" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#ECFDF5" align="center" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 700; color: #065F46;">Đạt / Học thử</div>
                          <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 3px;">${passedCount}</div>
                          <div style="font-size: 10.5px; color: #10B981; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '25%'}" align="center" class="kpi-cell" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#FFFBEB" align="center" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 700; color: #92400E;">Đạt cam kết</div>
                          <div style="font-size: 22px; font-weight: 900; color: #D97706; margin-top: 3px;">${committedCount}</div>
                          <div style="font-size: 10.5px; color: #B45309; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '25%'}" align="center" class="kpi-cell" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#FEF2F2" align="center" style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 700; color: #991B1B;">Không đạt</div>
                          <div style="font-size: 22px; font-weight: 900; color: #DC2626; margin-top: 3px;">${failedCount}</div>
                          <div style="font-size: 10.5px; color: #EF4444; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${absentCount > 0 ? `
                  <td width="20%" align="center" class="kpi-cell" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#F1F5F9" align="center" style="background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 700; color: #475569;">Vắng khảo sát</div>
                          <div style="font-size: 22px; font-weight: 900; color: #64748B; margin-top: 3px;">${absentCount}</div>
                          <div style="font-size: 10.5px; color: #94A3B8; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>` : ""}
                </tr>
              </table>
            </td>
          </tr>

          <!-- TABLE TITLE -->
          <tr>
            <td class="table-title-pad" style="padding: 20px 28px 12px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <h2 style="margin: 0; font-size: 14.5px; font-weight: 800; color: #003B3A; letter-spacing: 0.2px;">
                      📋 Danh sách học sinh &amp; Kết quả xét duyệt chi tiết
                    </h2>
                  </td>
                  <td align="right" class="tabular-nums" style="font-size: 12px; font-weight: 700; color: #64748B; white-space: nowrap;">
                    Tổng số: <strong style="color: #007A87;">${totalCount}</strong> học sinh
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DATA TABLE (RESPONSIVE: TABLE ON DESKTOP / STACKED CARDS ON MOBILE) -->
          <tr>
            <td class="table-pad" style="padding: 0 28px 24px 28px;">
              <div class="table-scroll" style="overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #E2E8F0; border-radius: 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="responsive-table tabular-nums" style="border-collapse: collapse; width: 100%; font-size: 12px;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color: #003B3A; border-bottom: 2px solid #00A19A;">
                      <th style="padding: 10px 7px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: left; white-space: nowrap;">Mã HS</th>
                      <th style="padding: 10px 8px; font-size: 11px; font-weight: 600; color: #FFFFFF; text-align: left;">Học sinh</th>
                      <th style="padding: 10px 6px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: center; white-space: nowrap;">Ngày sinh</th>
                      <th style="padding: 10px 6px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: center; white-space: nowrap;">Giới tính</th>
                      <th style="padding: 10px 6px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: center; white-space: nowrap;">Khối</th>
                      <th style="padding: 10px 6px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: center; white-space: nowrap;">Hệ</th>
                      <th style="padding: 10px 6px; font-size: 11px; font-weight: 600; color: #CCFBF1; text-align: center; white-space: nowrap;">Cơ sở</th>
                      <th style="padding: 10px 8px; font-size: 11px; font-weight: 600; color: #FFFFFF; text-align: left;">Kết quả khảo sát</th>
                      <th style="padding: 10px 8px; font-size: 11px; font-weight: 600; color: #FDE68A; text-align: left; white-space: nowrap;">Môn cam kết</th>
                      <th style="padding: 10px 8px; font-size: 11px; font-weight: 600; color: #5EEAD4; text-align: center; white-space: nowrap;">KQ đã xét duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

          <!-- PORTAL LINK BUTTON -->
          <tr>
            <td class="section-pad" style="padding: 20px 28px 24px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 10px; box-shadow: 0 4px 14px rgba(0, 59, 58, 0.2);">
                    <a href="${baseUrl}/admin/xet-duyet-ket-qua" target="_blank" class="cta-btn" style="display: inline-block; padding: 12px 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      🔗 Truy cập Cổng quản lý để xem hồ sơ &amp; biên bản &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OFFICIAL SKY-LINE BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" class="footer-pad" style="background-color: #003B3A; border-top: 3px solid #00A19A; padding: 22px 24px; text-align: center; font-size: 11px; color: #CCFBF1; line-height: 1.6;">
              <div style="font-weight: 800; color: #FFFFFF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </div>
              <div style="color: #99F6E4; font-weight: 700; font-size: 11px; letter-spacing: 0.4px; margin-top: 3px;">
                Ban KT&amp;ĐBCL
              </div>
              <div style="margin-top: 8px; color: rgba(255, 255, 255, 0.85); font-size: 11px;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 700;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 700;">skylineschool.edu.vn</a>
              </div>
              <div style="margin-top: 10px; font-size: 10px; color: rgba(255, 255, 255, 0.5); line-height: 1.5;">
                Email này được gửi tự động từ <b>Hệ thống Quản lý Khảo sát Tuyển sinh Sky-Line (Sky-line SMS)</b> khi hoàn tất xét duyệt kết quả.<br/>
                <b>Người nhận chính (To):</b> Giám đốc Cơ sở, Tư vấn Tuyển sinh Cơ sở, Giáo vụ Cơ sở &bull; <b>Đồng kính gửi (CC):</b> Ban KT&amp;ĐBCL.<br/>
                Vui lòng không trả lời trực tiếp email này. &copy; ${new Date().getFullYear()} Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 6. Gửi email qua SMTP & cập nhật Tiến độ Điều hành Khảo sát (Stage 6 & 7)
    const recipientsTo = Array.from(toEmails);
    const recipientsCc = Array.from(ccEmails);

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: {
          subject: emailSubject,
          html: emailHtml,
          toRecipients: recipientsTo,
          ccRecipients: recipientsCc,
          batchName: finalBatchName,
          campusName: finalCampusName,
          studentCount: students.length
        }
      });
    }

    try {
      const actor = {
        id: (session.user as any)?.id || "gdcs_approver",
        fullName: currentUserName,
        role: (session.user as any)?.role || "GDCS",
        isSuperAdmin: Boolean((session.user as any)?.isSuperAdmin),
      };
      for (const st of students) {
        const stId = st.id ? String(st.id) : null;
        if (!stId) continue;
        const conclusion = st.admissionResult || st.surveyResult || "";
        if (isOfficiallyApprovedConclusion(conclusion)) {
          await executeEntranceWorkflowAction({
            action: "CONFIRM",
            targetScope: "STUDENT",
            isPreschool: Boolean(isPreschool),
            periodId: periodId || "PERIOD_APPROVAL",
            batchId: batchId || null,
            studentIds: [stId],
            stageNumber: 6,
            status: "COMPLETED",
            admissionResult: conclusion,
            note: cleanDirectorNoteForEmail(st.directorNote) !== "—" ? cleanDirectorNoteForEmail(st.directorNote) : `GĐCS phê duyệt kết luận: ${conclusion}`,
            actor,
          });
          await executeEntranceWorkflowAction({
            action: "CONFIRM",
            targetScope: "STUDENT",
            isPreschool: Boolean(isPreschool),
            periodId: periodId || "PERIOD_APPROVAL",
            batchId: batchId || null,
            studentIds: [stId],
            stageNumber: 7,
            status: "COMPLETED",
            note: `Đã gửi thông báo kết quả xét duyệt qua email đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở & Ban KT&ĐBCL (${recipientsTo.join(", ")})`,
            actor,
          });
        }
      }
    } catch (wfSyncErr) {
      console.warn("Workflow Stage 6/7 sync warning:", wfSyncErr);
    }

    const sendResult = await sendEmail({
      to: recipientsTo,
      cc: recipientsCc.length > 0 ? recipientsCc : undefined,
      subject: emailSubject,
      html: emailHtml
    });

    return NextResponse.json({
      success: sendResult.success,
      sentToCount: recipientsTo.length,
      sentCcCount: recipientsCc.length,
      toRecipients: recipientsTo,
      ccRecipients: recipientsCc,
      groups: {
        gdcs: Array.from(gdcsEmails),
        tuvan: Array.from(tuvanEmails),
        giaovu: Array.from(giaovuEmails),
        ktdbcl: Array.from(ktdbclEmails)
      },
      error: sendResult.error
    });

  } catch (error: any) {
    console.error("API send-approval-result-email error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi gửi email" }, { status: 500 });
  }
}
