import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"
import { buildStudentQuickApproveUrls } from "@/lib/k12-approval-service"
import { buildPsychologyGdcsCcList } from "@/lib/orientation/service"
import {
  requireStaffSession,
  requireAdminOrLeadershipSession,
  getSafeAppBaseUrl,
  writeSecurityAuditLog
} from "@/lib/security-guard"

function parseSmartDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const str = String(d).trim();
  if (!str) return null;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const dt = new Date(year, month, day);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req) {
  const ctx = await requireStaffSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { isGDCS, allowedCampusIds } = ctx;
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("get_max_code") === "true") { const allCodes = await (prisma as any).inputAssessmentStudent.findMany({ where: { studentCode: { startsWith: "HS" } }, select: { studentCode: true } }); const nums = allCodes.map((s: any) => { const m = String(s.studentCode || "").match(/\d+$/); return m ? parseInt(m[0], 10) : 0; }).filter((n: number) => !isNaN(n)); const maxNum = nums.length > 0 ? Math.max(0, ...nums) : 0; return NextResponse.json({ nextCode: "HS" + (maxNum + 1).toString().padStart(3, "0") }); } if (false && searchParams.get("get_max_code") === "true") {
      const topStudent = await (prisma as any).inputAssessmentStudent.findFirst({
        where: { studentCode: { startsWith: "HS" } },
        orderBy: { studentCode: "desc" },
        select: { studentCode: true }
      });
      if (topStudent?.studentCode) {
        const match = String(topStudent.studentCode).match(/\d+$/);
        const maxNum = match ? parseInt(match[0], 10) : 0;
        return NextResponse.json({ nextCode: "HS" + (maxNum + 1).toString().padStart(3, "0") });
      }
      return NextResponse.json({ nextCode: "HS001" });
    }
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    const academicYearId = searchParams.get("academicYearId");
    const campusCode = searchParams.get("campusCode");
    const grade = searchParams.get("grade");
    const unassignedOnly = searchParams.get("unassignedOnly") === "true";
    const search = searchParams.get("search");
    
    if (!periodId && !academicYearId && searchParams.get("fetch_all") !== "true") {
       return NextResponse.json({ error: "Missing periodId or academicYearId" }, { status: 400 });
    }
    
    const where: any = {};
    if (periodId && periodId !== "all") {
      where.periodId = periodId;
    } else if (academicYearId) {
      where.period = { academicYearId };
    }

    const andConditions: any[] = [];
    if (batchId && batchId !== "all" && batchId !== "null") {
      andConditions.push({
        OR: [{ batchId: batchId }, { batchId: null }]
      });
    } else if (batchId === "null") {
      where.batchId = null;
    }

    if (grade && grade !== "all") {
      where.grade = grade;
    }

    if (campusCode && campusCode !== "all") {
      andConditions.push({
        OR: [
          { registeredCampus: campusCode },
          { admissionCampus: campusCode }
        ]
      });
    }

    if (unassignedOnly) {
      where.studentSessions = { none: {} };
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { fullName: { contains: q } },
          { studentCode: { contains: q } }
        ]
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    
    const students = await (prisma as any).inputAssessmentStudent.findMany({
      where,
      include: { 
        period: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
        scores: {
          include: {
            subject: true
          }
        },
        studentSessions: {
          include: {
            session: {
              select: {
                id: true,
                sessionCode: true,
                name: true,
                sessionDate: true,
                startTime: true,
                endTime: true,
                room: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const excludeCompletedBatches = searchParams.get("excludeCompletedBatches") === "true";
    let finalStudents = excludeCompletedBatches
      ? students.filter((s: any) => s.batch?.status !== "COMPLETED")
      : students;

    if (isGDCS && allowedCampusIds.length > 0) {
      const allowedCampuses = await (prisma as any).campus.findMany({
        where: { id: { in: allowedCampusIds } },
        select: { id: true, campusCode: true, campusName: true }
      }).catch(() => []);
      const allowedTokens = new Set<string>();
      for (const c of allowedCampuses) {
        if (c.id) allowedTokens.add(String(c.id).trim().toUpperCase());
        if (c.campusCode) allowedTokens.add(String(c.campusCode).trim().toUpperCase());
        if (c.campusName) allowedTokens.add(String(c.campusName).trim().toUpperCase());
      }
      if (allowedTokens.size > 0) {
        finalStudents = finalStudents.filter((s: any) => {
          const reg = String(s.registeredCampus || "").trim().toUpperCase();
          const adm = String(s.admissionCampus || "").trim().toUpperCase();
          if (!reg && !adm) return true;
          return allowedTokens.has(reg) || allowedTokens.has(adm);
        });
      }
    }

    // Gắn trạng thái Đã gửi mail cho GĐCS từ AuditLog
    try {
      const studentIds = finalStudents.map((s: any) => String(s.id)).filter(Boolean);
      if (studentIds.length > 0) {
        const gdcsLogs = await (prisma as any).auditLog.findMany({
          where: {
            action: "GDCS_APPROVAL_EMAIL_SENT",
            targetTable: "InputAssessmentStudent",
            targetId: { in: studentIds }
          },
          orderBy: { createdAt: "desc" },
          select: { targetId: true, createdAt: true, newValues: true }
        });
        const gdcsMap = new Map<string, { sentAt: string; recipient: string }>();
        for (const log of gdcsLogs || []) {
          if (!log?.targetId || gdcsMap.has(log.targetId)) continue;
          let recipient = "";
          try {
            const parsed = log.newValues ? JSON.parse(log.newValues) : null;
            recipient = parsed?.to || "";
          } catch {}
          gdcsMap.set(log.targetId, {
            sentAt: log.createdAt ? new Date(log.createdAt).toISOString() : "",
            recipient
          });
        }
        // Gắn thêm thông tin Trạng thái gửi email trả kết quả, Người gửi, Thời gian gửi (Công đoạn 7)
        const stage7Map = new Map<string, { status: string; sentBy: string; sentAt: string; note: string }>();
        try {
          const chunkSize = 80;
          for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => "?").join(",");
            const rows: any[] = await (prisma as any).$queryRawUnsafe(
              `SELECT "studentId", "status", "deliveryStatus", "confirmedByName", "confirmedAt", "updatedAt", "note"
               FROM "entrance_workflow_confirmations"
               WHERE "stageNumber" = 7 AND "studentId" IN (${placeholders})
               ORDER BY COALESCE("confirmedAt", "updatedAt") DESC`,
              ...chunk
            );
            for (const row of rows || []) {
              const sid = String(row?.studentId || "");
              if (!sid || stage7Map.has(sid)) continue;
              const isSent =
                String(row?.deliveryStatus || "").toUpperCase() === "SENT" ||
                String(row?.deliveryStatus || "").toUpperCase() === "READ" ||
                String(row?.deliveryStatus || "").toUpperCase() === "CONFIRMED" ||
                String(row?.status || "").toUpperCase() === "COMPLETED";
              if (isSent) {
                stage7Map.set(sid, {
                  status: "SENT",
                  sentBy: String(row?.confirmedByName || "").trim(),
                  sentAt: String(row?.confirmedAt || row?.updatedAt || ""),
                  note: String(row?.note || ""),
                });
              }
            }
          }
        } catch {}

        finalStudents = finalStudents.map((s: any) => {
          const info = gdcsMap.get(String(s.id));
          const s7 = stage7Map.get(String(s.id));
          return {
            ...s,
            ...(info ? { gdcsEmailSentAt: info.sentAt, gdcsEmailRecipient: info.recipient } : {}),
            resultEmailStatus: s7?.status || "NOT_SENT",
            resultEmailSentBy: s7?.sentBy || null,
            resultEmailSentAt: s7?.sentAt || null,
            resultEmailNote: s7?.note || null,
          };
        });
      }
    } catch {}

    return NextResponse.json(finalStudents, { headers: { "X-API-Version": "20260516.1" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = await requireStaffSession();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { action, data } = body;
    

    if (action === "SYNC_WITH_MASTER_STUDENTS") {
      const masterStudents = await prisma.student.findMany({
        select: {
          studentCode: true,
          studentName: true,
          gender: true,
          dateOfBirth: true
        }
      });

      const masterMap = new Map();
      for (const ms of masterStudents) {
        if (ms.studentCode) {
          masterMap.set(ms.studentCode.trim().toUpperCase(), ms);
        }
      }

      const k12Students = await (prisma as any).inputAssessmentStudent.findMany({
        select: { id: true, studentCode: true, fullName: true, gender: true, dateOfBirth: true }
      });

      let updatedK12Count = 0;
      for (const student of k12Students) {
        const sCode = (student.studentCode || "").trim().toUpperCase();
        const master = masterMap.get(sCode);
        if (master) {
          const nameChanged = master.studentName && master.studentName !== student.fullName;
          const genderChanged = master.gender && master.gender !== student.gender;
          const dobMasterStr = master.dateOfBirth ? new Date(master.dateOfBirth).toISOString().split("T")[0] : null;
          const dobCurrStr = student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : null;
          const dobChanged = dobMasterStr && dobMasterStr !== dobCurrStr;

          if (nameChanged || genderChanged || dobChanged) {
            await (prisma as any).inputAssessmentStudent.update({
              where: { id: student.id },
              data: {
                fullName: master.studentName,
                gender: master.gender || student.gender,
                dateOfBirth: master.dateOfBirth || student.dateOfBirth
              }
            });
            updatedK12Count++;
          }
        }
      }

      let updatedPreschoolCount = 0;
      try {
        const preschoolStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
          select: { id: true, studentCode: true, fullName: true, gender: true, dateOfBirth: true }
        });
        for (const child of preschoolStudents) {
          const sCode = (child.studentCode || "").trim().toUpperCase();
          const master = masterMap.get(sCode);
          if (master) {
            const nameChanged = master.studentName && master.studentName !== child.fullName;
            const genderChanged = master.gender && master.gender !== child.gender;
            const dobMasterStr = master.dateOfBirth ? new Date(master.dateOfBirth).toISOString().split("T")[0] : null;
            const dobCurrStr = child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split("T")[0] : null;
            const dobChanged = dobMasterStr && dobMasterStr !== dobCurrStr;

            if (nameChanged || genderChanged || dobChanged) {
              await (prisma as any).preschoolInputAssessmentStudent.update({
                where: { id: child.id },
                data: {
                  fullName: master.studentName,
                  gender: master.gender || child.gender,
                  dateOfBirth: master.dateOfBirth || child.dateOfBirth
                }
              });
              updatedPreschoolCount++;
            }
          }
        }
      } catch (e) {
        console.error("Preschool sync error:", e);
      }

      const totalUpdated = updatedK12Count + updatedPreschoolCount;
      return NextResponse.json({
        success: true,
        message: `Đã đồng bộ thành công ${totalUpdated} học sinh khớp với danh sách Học sinh gốc (Họ và tên, Giới tính, Ngày sinh)!`,
        updatedK12Count,
        updatedPreschoolCount
      });
    }

    if (action === "CREATE") {
      if (!data.periodId) {
        return NextResponse.json({ error: "Kỳ khảo sát là bắt buộc" }, { status: 400 });
      }
      let finalStudentCode = (data.studentCode || "").trim();
      if (!finalStudentCode) {
        const allStudents = await (prisma as any).inputAssessmentStudent.findMany({ select: { studentCode: true } });
        const nums = allStudents.map((s: any) => {
          const match = String(s.studentCode || "").match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter((n: number) => !isNaN(n));
        const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
        finalStudentCode = "HS" + (maxNum + 1).toString().padStart(3, "0");
      }

      const result = await (prisma as any).inputAssessmentStudent.create({
        data: {
           studentCode: finalStudentCode,
           fullName: data.fullName,
           dateOfBirth: parseSmartDate(data.dateOfBirth),
           gender: data.gender || null,
           className: data.className || null,
           grade: data.grade || null,
           academicRating: data.academicRating || null,
           conductRating: data.conductRating || null,
           admissionCriteria: data.admissionCriteria || null,
           surveySystem: data.surveySystem || null,
           targetType: data.targetType || null,
           surveyFormType: data.surveyFormType || null,
           signatureName: data.signatureName || null,
           hocKy: data.hocKy || null,
           kqgdTieuHoc: data.kqgdTieuHoc || null,
           kqHocTap: data.kqHocTap || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
           kqRenLuyen: data.kqRenLuyen || null,
           psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
           writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
           oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
           mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
           literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
           periodId: data.periodId,
         batchId: data.batchId || null,
           registeredCampus: data.registeredCampus || null,
           isAbsent: data.isAbsent || false,
            cityName: data.cityName || null,
            districtName: data.districtName || null,
            wardName: data.wardName || null,
            countryName: data.countryName || null,
            oldSchoolName: data.oldSchoolName || null,
            oldSchoolType: data.oldSchoolType || null,
        }
      });
      return NextResponse.json(result);
    }
    

    if (action === "BULK_CREATE") {
      if (!Array.isArray(data)) {
          return NextResponse.json({ error: "data must be an array" }, { status: 400 });
      }
      const results = [];
      const errors = [];
      
      let maxNum = 0;
      const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n) => !isNaN(n));
      if (nums.length > 0) maxNum = Math.max(...nums);
      
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        
        if (!d.studentCode || d.studentCode.trim() === "") {
            maxNum++;
            d.studentCode = "HS" + maxNum.toString().padStart(3, "0");
        }
        
        try {
          const existing = await (prisma as any).inputAssessmentStudent.findFirst({
            where: { studentCode: d.studentCode, periodId: d.periodId }
          });

          const studentData = {
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
            gender: d.gender || null,
            className: d.className || null,
            grade: d.grade || null,
            academicRating: d.academicRating || null,
            conductRating: d.conductRating || null,
            admissionCriteria: d.admissionCriteria || null,
            surveySystem: d.surveySystem || null,
            targetType: d.targetType || null,
            surveyFormType: d.surveyFormType || null,
            signatureName: d.signatureName || null,
            hocKy: d.hocKy || null,
            kqgdTieuHoc: d.kqgdTieuHoc || null,
            kqHocTap: d.kqHocTap || null,
              hoSoCtQuocTe: d.hoSoCtQuocTe || null,
            hoSoCtQuocTe: d.hoSoCtQuocTe || null,
            kqRenLuyen: d.kqRenLuyen || null,
            psychologyScore: d.psychologyScore ? parseFloat(d.psychologyScore) : null,
            writtenEnglishScore: d.writtenEnglishScore ? parseFloat(d.writtenEnglishScore) : null,
            oralEnglishScore: d.oralEnglishScore ? parseFloat(d.oralEnglishScore) : null,
            mathScore: d.mathScore ? parseFloat(d.mathScore) : null,
            literatureScore: d.literatureScore ? parseFloat(d.literatureScore) : null,
            batchId: d.batchId || null,
            registeredCampus: d.registeredCampus || null,
            isAbsent: d.isAbsent || false,
            cityName: d.cityName || null,
            districtName: d.districtName || null,
            wardName: d.wardName || null,
            countryName: d.countryName || null,
            oldSchoolName: d.oldSchoolName || null,
            oldSchoolType: d.oldSchoolType || null,
          };

          let result;
          if (existing) {
            result = await (prisma as any).inputAssessmentStudent.update({
              where: { id: existing.id },
              data: studentData
            });
          } else {
            result = await (prisma as any).inputAssessmentStudent.create({
              data: {
                studentCode: d.studentCode,
                periodId: d.periodId,
                ...studentData
              }
            });
          }
          results.push(result);
        } catch (err) {
          errors.push({ row: i + 1, code: d.studentCode, error: err.message });
        }
      }
      return NextResponse.json({ success: true, created: results.length, errors });
    }

    if (action === "SEND_APPROVAL_REQUEST") {
      const { studentId, gdcsEmail } = data;
      if (!studentId || !gdcsEmail) {
        return NextResponse.json({ error: "Missing studentId or gdcsEmail" }, { status: 400 });
      }
      const normalizedGdcsEmail = String(gdcsEmail).trim().toLowerCase();
      if (!normalizedGdcsEmail.endsWith("@skylineschool.edu.vn") && !normalizedGdcsEmail.endsWith("@skyline.edu.vn")) {
        return NextResponse.json({ error: "Email phê duyệt phải thuộc tên miền nội bộ Sky-Line (@skylineschool.edu.vn)" }, { status: 400 });
      }

      // Fetch the student with scores and period/batch details
      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: {
          period: true,
          batch: true
        }
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      // Fetch the student's scores/results from teacher assignments
      const scores = await (prisma as any).studentAssessmentScore.findMany({
        where: { studentId },
        include: {
          subject: true
        }
      });

      // Prepare scores summary for email
      const scoresList = scores.map((sc) => {
        const subject = sc.subject || {};
        const sName = subject.name || "Môn học";
        const sCode = (subject.code || "").toLowerCase();
        let val = "—";
        try {
          if (sc.scores) {
            const parsed = JSON.parse(sc.scores);
            const vArr = Array.isArray(parsed) ? parsed : [parsed];
            if (sCode.includes("tly")) {
               const scNum = parseFloat(vArr[6] || vArr[20] || "0");
               let lvl = "Bình thường";
               if (scNum > 15 && scNum <= 31) lvl = "Dấu hiệu nhẹ";
               else if (scNum > 31 && scNum <= 47) lvl = "Dấu hiệu vừa";
               else if (scNum > 47 && scNum <= 63) lvl = "Nguy cơ cao";
               else if (scNum > 63) lvl = "Nguy cơ rất cao";
               val = `${lvl} (${scNum} đ)`;
            }
            else if (sCode.includes("tci") || sCode.includes("cpt")) {
              const pCount = vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
              val = `${pCount}/${vArr.length || 16} Đạt`;
            }
            else if (sCode.includes("nltd")) {
              const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
              val = pctVal !== undefined && pctVal !== null && pctVal !== "" ? pctVal + "%" : "—";
            }
            else val = vArr.find(x => x !== undefined && x !== "" && x !== null) || "—";
          }
        } catch { val = sc.scores || "—"; }
        return { name: sName, val };
      });

      const baseUrl = getSafeAppBaseUrl(req);

      // Rà soát & chuẩn hóa đúng tên Cơ sở tiếp nhận từ CSDL (admissionCampus -> registeredCampus -> batch.campusId -> batch.name -> gdcsEmail)
      const allCampusesForEmail = await prisma.campus.findMany({
        select: { id: true, campusCode: true, campusName: true }
      }).catch(() => []);

      const extractCampusCode = (raw?: string | null): string => {
        const up = String(raw || "").toUpperCase().trim();
        if (!up) return "";
        if (up.includes("CS1") || up.includes("RIVERSIDE") || up.includes("CƠ SỞ 1") || up.includes("CO SO 1")) return "CS1";
        if (up.includes("CS2") || up.includes("CENTRAL") || up.includes("CƠ SỞ 2") || up.includes("CO SO 2")) return "CS2";
        if (up.includes("CS3") || up.includes("GLOBAL") || up.includes("CƠ SỞ 3") || up.includes("CO SO 3")) return "CS3";
        if (up.includes("CS4") || up.includes("HILL") || up.includes("CƠ SỞ 4") || up.includes("CO SO 4")) return "CS4";
        if (up.includes("CS5") || up.includes("BEACH") || up.includes("CƠ SỞ 5") || up.includes("CO SO 5")) return "CS5";
        if (up.includes("CS6") || up.includes("INTERNATIONAL") || up.includes("QUỐC TẾ")) return "CS6";
        return "";
      };

      const inferCampusCodeFromEmail = (em: string): string => {
        const low = String(em || "").toLowerCase();
        if (low.includes("longtt") || low.includes(".cs1")) return "CS1";
        if (low.includes("khanhpt") || low.includes(".cs2")) return "CS2";
        if (low.includes("thanhtt") || low.includes(".cs3")) return "CS3";
        if (low.includes("trungct") || low.includes(".cs4")) return "CS4";
        if (low.includes("trungdq") || low.includes(".cs5")) return "CS5";
        return "";
      };

      const officialCampusNameByCode: Record<string, string> = {
        CS1: "CS1 - Sky-Line Riverside",
        CS2: "CS2 - Sky-Line Central",
        CS3: "CS3 - Sky-Line Global",
        CS4: "CS4 - Sky-Line Hill",
        CS5: "CS5 - Sky-Line Beach",
        CS6: "CS6 - Sky-Line International",
      };

      const resolveOfficialCampusName = (): string => {
        const candidates = [
          student.admissionCampus,
          student.registeredCampus,
          student.batch?.campusId,
          student.batch?.name,
        ].filter(Boolean);

        // 1. Khớp trực tiếp theo id, campusCode hoặc campusName trong bảng Campus
        for (const ref of candidates) {
          const refStr = String(ref).trim();
          const refUp = refStr.toUpperCase();
          const exact = allCampusesForEmail.find(
            (c: any) =>
              c.id === refStr ||
              String(c.campusCode || "").toUpperCase() === refUp ||
              String(c.campusName || "").toUpperCase() === refUp
          );
          if (exact) {
            const code = String(exact.campusCode || "").trim();
            const name = String(exact.campusName || "").trim();
            if (code && name && !name.toUpperCase().includes(code.toUpperCase())) {
              return `${code} - ${name}`;
            }
            return name || officialCampusNameByCode[code.toUpperCase()] || code;
          }
        }

        // 2. Trích xuất mã CS1..CS6 từ các chuỗi ứng viên hoặc từ email GĐCS
        let detectedCode = "";
        for (const ref of candidates) {
          detectedCode = extractCampusCode(String(ref));
          if (detectedCode) break;
        }
        if (!detectedCode) {
          detectedCode = inferCampusCodeFromEmail(normalizedGdcsEmail);
        }

        if (detectedCode) {
          const byCode = allCampusesForEmail.find(
            (c: any) => String(c.campusCode || "").toUpperCase() === detectedCode
          );
          if (byCode?.campusName) {
            const name = String(byCode.campusName).trim();
            return name.toUpperCase().includes(detectedCode) ? name : `${detectedCode} - ${name}`;
          }
          return officialCampusNameByCode[detectedCode] || detectedCode;
        }

        return student.admissionCampus || student.registeredCampus || "Hệ thống Giáo dục Sky-Line";
      };

      const campusName = resolveOfficialCampusName();
      const quickUrls = buildStudentQuickApproveUrls({
        studentId: String(student.id),
        isPreschool: false,
        baseUrl,
        recipientEmail: gdcsEmail,
        periodId: student.periodId,
        batchId: student.batchId
      });

      // Prepare email html body
      const isOralNonScoringName = (name: string) => {
        const lower = String(name || "").toLowerCase().normalize("NFC");
        return (
          lower.includes("tiếng anh") &&
          !lower.includes("esl") &&
          (lower.includes("vấn đáp") || lower.includes("nói"))
        );
      };

      const scoresRowsHtml = scoresList.map(s => {
        const isNonScoring = isOralNonScoringName(s.name);
        return `
        <tr style="border-bottom: 1px solid #E2E8F0; ${isNonScoring ? "background-color: #FFFBEB;" : ""}">
          <td style="padding: 10px 14px; font-size: 13px; color: ${isNonScoring ? "#92400E" : "#1E293B"}; font-weight: 600;">
            ${s.name}
            ${isNonScoring ? `<span style="display: inline-block; margin-left: 6px; padding: 2px 6px; border-radius: 4px; background-color: #FEF3C7; border: 1px solid #FCD34D; color: #B45309; font-size: 10px; font-weight: 700;">Không xét KQ</span>` : ""}
          </td>
          <td style="padding: 10px 14px; font-size: 13px; color: ${isNonScoring ? "#92400E" : "#003B3A"}; font-weight: 700; text-align: right;">${s.val}</td>
        </tr>
      `;
      }).join("");

      const canonicalizeCommitSubjectName = (raw: string) => {
        const clean = String(raw || "").trim().replace(/\s+/g, " ");
        const lower = clean.toLowerCase().normalize("NFC").replace(/[–—]/g, "-");
        if (lower === "toán" || lower === "toán học") return "Toán học";
        if (lower === "ngữ văn" || lower === "văn") return "Ngữ Văn";
        if (lower === "tiếng việt") return "Tiếng Việt";
        if (lower === "tiếng anh (viết)" || lower === "tiếng anh viết" || lower === "ta viết") return "Tiếng Anh (viết)";
        if (lower.includes("chuẩn phát triển")) return "Bộ chuẩn phát triển trẻ em 5-6 tuổi";
        if (lower.includes("tâm lý")) return "Tâm lý";
        return clean;
      };

      const commitSelectableSubjects: { name: string; val?: string }[] = [];
      const seenCommitKeys = new Set<string>();
      const pushCommitSubject = (rawName: string, val?: string) => {
        const canonical = canonicalizeCommitSubjectName(rawName);
        if (!canonical) return;
        const lower = canonical.toLowerCase().normalize("NFC").replace(/[–—]/g, "-").replace(/\s+/g, " ");
        if (lower.includes("định hướng") || lower.includes("năng lực tư duy")) return;
        if (isOralNonScoringName(canonical)) return;
        if (seenCommitKeys.has(lower)) return;
        seenCommitKeys.add(lower);
        commitSelectableSubjects.push({ name: canonical, val });
      };

      // 1. Lấy các môn học sinh đã có điểm khảo sát
      for (const s of scoresList) {
        pushCommitSubject(s.name, s.val);
      }

      // 2. Luôn bổ sung đầy đủ các môn chuẩn theo Khối + Hệ + Kỳ (kể cả khi HS chưa có điểm hoặc mới có điểm một phần)
      const gradeNumForCommit = parseInt(String(student?.grade || "0").replace(/\D/g, ""), 10) || 1;
      const sysRawForCommit = `${student?.surveyFormType || ""} ${student?.surveySystem || ""}`.toUpperCase();
      const isTransferForCommit =
        Boolean(student?.isChuyenHe) ||
        String(student?.period?.name || "").toLowerCase().normalize("NFC").includes("chuyển hệ") ||
        String(student?.batch?.name || "").toLowerCase().normalize("NFC").includes("chuyển hệ");
      const isSystemIForCommit =
        sysRawForCommit.includes("HNG") ||
        sysRawForCommit.includes("SB") ||
        sysRawForCommit.includes("SONG BẰNG") ||
        sysRawForCommit.includes("HỆ I");

      const defaultCommitSubjects = isTransferForCommit
        ? ["EPT", "ESL (vấn đáp)"]
        : isSystemIForCommit
        ? gradeNumForCommit === 1
          ? ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "ESL (vấn đáp)", "Tâm lý"]
          : gradeNumForCommit <= 5
          ? ["Toán học", "Tiếng Việt", "EPT", "ESL (vấn đáp)"]
          : ["Toán học", "Ngữ Văn", "EPT", "ESL (vấn đáp)"]
        : gradeNumForCommit === 1
        ? ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "Tâm lý"]
        : gradeNumForCommit <= 5
        ? ["Toán học", "Tiếng Việt", "Tiếng Anh (viết)"]
        : ["Toán học", "Ngữ Văn", "Tiếng Anh (viết)"];

      for (const defName of defaultCommitSubjects) {
        pushCommitSubject(defName);
      }

      const allCommitNamesParam = commitSelectableSubjects.map(s => s.name).join(",");
      const commitSubjectChipsHtml = commitSelectableSubjects.length > 0
        ? `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px auto; width: 100%; max-width: 480px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px;">
            <tr>
              <td style="padding: 10px 12px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #92400E; margin-bottom: 8px;">
                  Chọn nhanh 1 chạm môn Cam kết (ghi nhận ngay vào kết quả):
                </div>
                <div>
                  ${commitSelectableSubjects.map(s => `
                    <a href="${quickUrls.approveCamKetOrHocThuUrl}&preselect=${encodeURIComponent(s.name)}" target="_blank" style="display: inline-block; margin: 3px; padding: 6px 12px; background-color: #FFFFFF; border: 1px solid #F59E0B; border-radius: 8px; color: #92400E; font-size: 12px; font-weight: 700; text-decoration: none;">
                      ☑ ${s.name}${s.val && s.val !== "—" ? ` (${s.val})` : ""}
                    </a>
                  `).join("")}
                  ${commitSelectableSubjects.length >= 2 ? `
                    <a href="${quickUrls.approveCamKetOrHocThuUrl}&preselect=${encodeURIComponent(allCommitNamesParam)}" target="_blank" style="display: inline-block; margin: 4px 3px 2px 3px; padding: 6px 12px; background-color: #FEF3C7; border: 1px solid #D97706; border-radius: 8px; color: #78350F; font-size: 11.5px; font-weight: 800; text-decoration: none;">
                      ☑ Cam kết tất cả (${commitSelectableSubjects.length} môn)
                    </a>
                  ` : ""}
                </div>
              </td>
            </tr>
          </table>
        `
        : "";

      const dateOfBirthStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Yêu cầu phê duyệt kết quả khảo sát đầu vào</title>
          <style>
            @media only screen and (max-width: 600px) {
              .email-outer { padding: 10px 6px !important; }
              .email-card { width: 100% !important; border-radius: 12px !important; }
              .email-header { padding: 20px 16px !important; }
              .email-header h1 { font-size: 16px !important; }
              .email-pad { padding-left: 14px !important; padding-right: 14px !important; }
              .email-profile-label { width: 44% !important; font-size: 11px !important; }
              .email-profile-val { font-size: 13px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-outer" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="640" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#003B3A" class="email-header" style="background-color: #003B3A; padding: 28px 28px; text-align: center;">
                      <div style="margin-bottom: 10px;">
                        <img src="${baseUrl}/logo.png" alt="Sky-Line Education System" height="36" style="height: 36px; width: auto; display: inline-block; vertical-align: middle;" />
                      </div>
                      <div style="display: inline-block; padding: 3px 12px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px;">
                        HỆ THỐNG GIÁO DỤC SKY-LINE
                      </div>
                      <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                        YÊU CẦU PHÊ DUYỆT KẾT QUẢ KHẢO SÁT
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                        Khảo sát Năng lực Đầu vào K-12 • ${campusName}
                      </p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 28px 30px 16px 30px;">
                      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                        Hội đồng Tuyển sinh kính chuyển hồ sơ và kết quả khảo sát năng lực đầu vào của học sinh dưới đây để Thầy/Cô xem xét và phê duyệt trực tiếp ngay trên Email hoặc trên Cổng quản lý:
                      </p>
                    </td>
                  </tr>

                  <!-- Student Profile Card -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 18px 20px; border-collapse: separate;">
                        <tr>
                          <td style="padding-bottom: 10px; width: 40%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Họ và tên học sinh:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #003B3A;">${student.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Mã HS khảo sát:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #1E293B;">${student.studentCode}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Ngày sinh / Giới tính:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #334155;">${dateOfBirthStr} • ${student.gender === "FEMALE" || student.gender === "Nữ" || student.gender === "F" ? "Nữ" : "Nam"}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Khối lớp / Hệ học:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #334155;">Khối ${student.grade || "—"} / Hệ ${student.surveyFormType || student.surveySystem || "—"}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Cơ sở tiếp nhận:</td>
                          <td style="font-size: 14px; font-weight: 700; color: #003B3A;">${campusName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Scores Table -->
                  ${scoresList.length > 0 ? `
                  <tr>
                    <td style="padding: 0 30px 22px 30px;">
                      <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        📊 BẢNG ĐIỂM CHI TIẾT CÁC MÔN KHẢO SÁT
                      </div>
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; border-collapse: collapse;">
                        <thead>
                          <tr bgcolor="#003B3A" style="background-color: #003B3A;">
                            <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px;">Môn khảo sát</th>
                            <th align="right" style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 35%;">Kết quả</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${scoresRowsHtml}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  ` : ""}

                  <!-- DIRECT 1-TAP EMAIL APPROVAL BUTTONS FOR GDCS -->
                  <tr>
                    <td align="center" style="padding: 16px 30px 26px 30px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                      <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                        ⚡ CHỌN NHANH 1 CHẠM — GHI NHẬN KẾT QUẢ TRỰC TIẾP (GĐCS)
                      </div>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px auto; width: 100%; max-width: 480px;">
                        <tr>
                          <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px;">
                            <a href="${quickUrls.approveDatUrl}" target="_blank" style="display: block; padding: 13px 24px; font-size: 13.5px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                              ✓ PHÊ DUYỆT NGAY: ĐẠT CHUẨN
                            </a>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 8px auto; width: 100%; max-width: 480px;">
                        <tr>
                          <td align="center" bgcolor="#D97706" style="background-color: #D97706; border-radius: 10px;">
                            <a href="${quickUrls.approveCamKetOrHocThuUrl}" target="_blank" style="display: block; padding: 12px 24px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                              ⚠ PHÊ DUYỆT NGAY: ĐẠT CAM KẾT
                            </a>
                          </td>
                        </tr>
                      </table>
                      ${commitSubjectChipsHtml}

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; width: 100%; max-width: 480px;">
                        <tr>
                          <td align="center" bgcolor="#E11D48" style="background-color: #E11D48; border-radius: 10px;">
                            <a href="${quickUrls.approveKhongDatUrl}" target="_blank" style="display: block; padding: 11px 24px; font-size: 12.5px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                              ✕ PHÊ DUYỆT NGAY: KHÔNG ĐẠT / KHẢO SÁT LẠI
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748B; line-height: 1.5;">
                        * Chọn trực tiếp 1 chạm ở các tùy chọn trên — hệ thống sẽ cập nhật ngay vào bảng Ghi nhận kết quả mà không cần đăng nhập hay mở cổng.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                      <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                        HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                        Ban KT&amp;ĐBCL
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                        Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const ccList = buildPsychologyGdcsCcList({
          campusCodeOrName: campusName,
          giaovuEmail: data?.giaovuEmail,
          tuyensinhEmail: data?.tuyensinhEmail
        });
        const emailSubject = `[Sky-line SMS - Xét Duyệt] Yêu cầu duyệt kết quả khảo sát đầu vào - Học sinh ${student.fullName} (${campusName})`;
        if (data?.previewOnly) {
          return NextResponse.json({
            success: true,
            preview: {
              subject: emailSubject,
              to: gdcsEmail,
              cc: ccList,
              html: emailHtml,
              studentName: student.fullName,
              campusName
            }
          });
        }
        const mailRes = await sendEmail({
          to: gdcsEmail,
          cc: ccList,
          subject: emailSubject,
          html: emailHtml,
          replyTo: "ktdbcl@skylineschool.edu.vn"
        });
        if (!mailRes?.success) {
          return NextResponse.json({ error: "Lỗi khi gửi email: " + (mailRes?.error || "SMTP error") }, { status: 500 });
        }
        const sentAt = new Date();
        try {
          await (prisma as any).auditLog.create({
            data: {
              userId: String(ctx?.userId || "system"),
              userEmail: String(ctx?.email || "ktdbcl@skylineschool.edu.vn"),
              action: "GDCS_APPROVAL_EMAIL_SENT",
              targetTable: "InputAssessmentStudent",
              targetId: String(student.id),
              newValues: JSON.stringify({ to: gdcsEmail, cc: ccList, sentAt: sentAt.toISOString() })
            }
          });
        } catch {}
        return NextResponse.json({ success: true, ccList, gdcsEmailSentAt: sentAt.toISOString(), gdcsEmailRecipient: gdcsEmail });
      } catch(err) {
        console.error("GDCS send email err", err);
        return NextResponse.json({ error: "Lỗi khi gửi email: " + err.message }, { status: 500 });
      }
    }

    if (action === "RETEST_REGISTER") {
      const { studentId, targetPeriodId, targetBatchId } = data;
      if (!studentId || !targetPeriodId) {
        return NextResponse.json({ error: "Missing studentId or targetPeriodId" }, { status: 400 });
      }

      const sourceStudent = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });
      if (!sourceStudent) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const existing = await (prisma as any).inputAssessmentStudent.findFirst({
        where: {
          studentCode: sourceStudent.studentCode,
          periodId: targetPeriodId,
          batchId: targetBatchId || null
        }
      });
      if (existing) {
        return NextResponse.json({ error: `Học sinh này đã được đăng ký khảo sát ở Kỳ khảo sát được chọn (Mã HS: ${sourceStudent.studentCode})` }, { status: 400 });
      }

      const newStudent = await (prisma as any).inputAssessmentStudent.create({
        data: {
          studentCode: sourceStudent.studentCode,
          fullName: sourceStudent.fullName,
          dateOfBirth: sourceStudent.dateOfBirth,
          gender: sourceStudent.gender,
          className: sourceStudent.className,
          grade: sourceStudent.grade,
          academicRating: sourceStudent.academicRating,
          conductRating: sourceStudent.conductRating,
          admissionCriteria: sourceStudent.admissionCriteria,
          surveySystem: sourceStudent.surveySystem,
          targetType: sourceStudent.targetType,
          surveyFormType: sourceStudent.surveyFormType,
          hocKy: sourceStudent.hocKy,
          kqgdTieuHoc: sourceStudent.kqgdTieuHoc,
          kqHocTap: sourceStudent.kqHocTap,
          hoSoCtQuocTe: sourceStudent.hoSoCtQuocTe,
          kqRenLuyen: sourceStudent.kqRenLuyen,
          periodId: targetPeriodId,
          batchId: targetBatchId || null,
          admissionResult: null,
          directorNote: `Kiểm tra lại đợt trước từ kỳ: ${sourceStudent.periodId}`,
          admissionCampus: sourceStudent.admissionCampus,
        }
      });

      return NextResponse.json({ success: true, newStudent });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const ctx = await requireStaffSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, role: userRole } = ctx;
  const isApproverRole =
    ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "BAN_GIAM_HIEU", "BGH", "BGH_CS", "BGH_MN", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "TB_DHCM", "BAN_DHCM"].includes(userRole) ||
    Boolean(user?.isSuperAdmin);
  const isManagerOrAdmin = isApproverRole;

  try {
    const body = await req.json();
    const { id, ids, data } = body;

    if (data?.admissionResult !== undefined && !isApproverRole) {
      return NextResponse.json(
        { error: "Chỉ Ban Giám đốc Cơ sở (GĐCS), Ban Giám hiệu hoặc KT&ĐBCL mới có thẩm quyền phê duyệt kết quả khảo sát đầu vào" },
        { status: 403 }
      );
    }

    // Hỗ trợ cập nhật hàng loạt (Batch Approval)
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const updatePayload: any = {};
      if (data.admissionResult !== undefined) updatePayload.admissionResult = data.admissionResult;
      if (data.admissionCampus !== undefined) updatePayload.admissionCampus = data.admissionCampus;
      if (data.signatureName !== undefined) updatePayload.signatureName = data.signatureName;
      if (data.directorNote !== undefined) updatePayload.directorNote = data.directorNote;

      const batchRes = await (prisma as any).inputAssessmentStudent.updateMany({
        where: { id: { in: ids } },
        data: updatePayload
      });
      await writeSecurityAuditLog({
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        action: "BATCH_APPROVE_INPUT_ASSESSMENT",
        targetTable: "InputAssessmentStudent",
        targetId: ids.slice(0, 5).join(","),
        newValues: { count: batchRes.count, ...updatePayload }
      });
      return NextResponse.json({ success: true, count: batchRes.count });
    }

    // Check if the student belongs to a locked batch
    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id },
      include: { batch: true }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const isBatchLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    if (isBatchLocked && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Đợt khảo sát này ĐÃ BỊ KHÓA! Mọi tính năng nhập, chỉnh sửa, xét duyệt đều bị vô hiệu hóa." }, { status: 403 });
    }
    
    // Clean relational & undefined fields from payload
    const updatePayload: any = {};
    if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
    if (data.dateOfBirth !== undefined) updatePayload.dateOfBirth = parseSmartDate(data.dateOfBirth);
    if (data.gender !== undefined) updatePayload.gender = data.gender || null;
    if (data.className !== undefined) updatePayload.className = data.className || null;
    if (data.grade !== undefined) updatePayload.grade = data.grade || null;
    if (data.academicRating !== undefined) updatePayload.academicRating = data.academicRating || null;
    if (data.conductRating !== undefined) updatePayload.conductRating = data.conductRating || null;
    if (data.admissionCriteria !== undefined) updatePayload.admissionCriteria = data.admissionCriteria || null;
    if (data.surveySystem !== undefined) updatePayload.surveySystem = data.surveySystem || null;
    if (data.targetType !== undefined) updatePayload.targetType = data.targetType || null;
    if (data.surveyFormType !== undefined) updatePayload.surveyFormType = data.surveyFormType || null;
    if (data.signatureName !== undefined) updatePayload.signatureName = data.signatureName || null;
    if (data.hocKy !== undefined) updatePayload.hocKy = data.hocKy || null;
    if (data.kqgdTieuHoc !== undefined) updatePayload.kqgdTieuHoc = data.kqgdTieuHoc || null;
    if (data.kqHocTap !== undefined) updatePayload.kqHocTap = data.kqHocTap || null;
    if (data.hoSoCtQuocTe !== undefined) updatePayload.hoSoCtQuocTe = data.hoSoCtQuocTe || null;
    if (data.kqRenLuyen !== undefined) updatePayload.kqRenLuyen = data.kqRenLuyen || null;
    if (data.batchId !== undefined) updatePayload.batchId = data.batchId || null;
    if (data.registeredCampus !== undefined) updatePayload.registeredCampus = data.registeredCampus || null;
    if (data.admissionResult !== undefined) updatePayload.admissionResult = data.admissionResult;
    if (data.directorNote !== undefined) updatePayload.directorNote = data.directorNote;
    if (data.admissionCampus !== undefined) updatePayload.admissionCampus = data.admissionCampus;
    if (data.isAbsent !== undefined) updatePayload.isAbsent = Boolean(data.isAbsent);
    if (data.cityName !== undefined) updatePayload.cityName = data.cityName || null;
    if (data.districtName !== undefined) updatePayload.districtName = data.districtName || null;
    if (data.wardName !== undefined) updatePayload.wardName = data.wardName || null;
    if (data.countryName !== undefined) updatePayload.countryName = data.countryName || null;
    if (data.oldSchoolName !== undefined) updatePayload.oldSchoolName = data.oldSchoolName || null;
    if (data.oldSchoolType !== undefined) updatePayload.oldSchoolType = data.oldSchoolType || null;

    if (data.psychologyScore !== undefined && data.psychologyScore !== null && !isNaN(parseFloat(data.psychologyScore))) {
      updatePayload.psychologyScore = parseFloat(data.psychologyScore);
    }
    if (data.writtenEnglishScore !== undefined && data.writtenEnglishScore !== null && !isNaN(parseFloat(data.writtenEnglishScore))) {
      updatePayload.writtenEnglishScore = parseFloat(data.writtenEnglishScore);
    }
    if (data.oralEnglishScore !== undefined && data.oralEnglishScore !== null && !isNaN(parseFloat(data.oralEnglishScore))) {
      updatePayload.oralEnglishScore = parseFloat(data.oralEnglishScore);
    }
    if (data.mathScore !== undefined && data.mathScore !== null && !isNaN(parseFloat(data.mathScore))) {
      updatePayload.mathScore = parseFloat(data.mathScore);
    }
    if (data.literatureScore !== undefined && data.literatureScore !== null && !isNaN(parseFloat(data.literatureScore))) {
      updatePayload.literatureScore = parseFloat(data.literatureScore);
    }

    const result = await (prisma as any).inputAssessmentStudent.update({
      where: { id },
      data: updatePayload
    });

    await writeSecurityAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: data.admissionResult !== undefined ? "APPROVE_INPUT_ASSESSMENT" : "UPDATE_INPUT_ASSESSMENT_STUDENT",
      targetTable: "InputAssessmentStudent",
      targetId: String(id),
      oldValues: {
        admissionResult: student.admissionResult,
        directorNote: student.directorNote
      },
      newValues: updatePayload
    });

    // Auto-sync Student.studentType if admissionResult is updated
    if (data.admissionResult !== undefined) {
      try {
        const candidateCodes = [result.enrollmentCode, result.studentCode].map((c: any) => (c || "").trim().toUpperCase()).filter(Boolean);
        const matchingStudents = await prisma.student.findMany({
          where: {
            OR: [
              { studentCode: { in: candidateCodes } },
              result.enrollmentClassId && result.fullName ? {
                classId: result.enrollmentClassId,
                studentName: result.fullName.trim()
              } : undefined
            ].filter(Boolean) as any
          }
        });

        const resLower = String(data.admissionResult || "").toLowerCase();
        const isGiaoLuu = resLower.includes("giao lưu") || resLower.includes("giao luu");

        for (const ms of matchingStudents) {
          if (isGiaoLuu && ms.studentType !== "GIAO_LUU") {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "GIAO_LUU",
                studentTypeNote: "Học giao lưu theo kết quả khảo sát đầu vào"
              }
            });
          } else if (!isGiaoLuu && ms.studentType === "GIAO_LUU" && (ms.studentTypeNote || "").includes("khảo sát")) {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "CHINH_KHOA",
                studentTypeNote: null
              }
            });
          }
        }
      } catch (syncErr) {
        console.error("Auto sync Student.studentType error:", syncErr);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = await requireAdminOrLeadershipSession();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",").map((s) => s.trim()).filter(Boolean);
      await (prisma as any).inputAssessmentStudent.deleteMany({ where: { id: { in: idArr } } });
      await writeSecurityAuditLog({
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        action: "BULK_DELETE_INPUT_ASSESSMENT_STUDENTS",
        targetTable: "InputAssessmentStudent",
        targetId: idArr.slice(0, 5).join(","),
        newValues: { deletedCount: idArr.length }
      });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await (prisma as any).inputAssessmentStudent.delete({ where: { id } });
    await writeSecurityAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "DELETE_INPUT_ASSESSMENT_STUDENT",
      targetTable: "InputAssessmentStudent",
      targetId: String(id)
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export async function PATCH(req: any) {
  try {
    const ctx = await requireStaffSession();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, ids, targetPeriodId, targetBatchId } = body;

    if (action === "BULK_UPDATE_BATCH") {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Danh sách học sinh không hợp lệ" }, { status: 400 });
      }

      if (!targetPeriodId) {
        return NextResponse.json({ error: "Vui lòng chọn Kỳ khảo sát đích" }, { status: 400 });
      }

      const result = await (prisma as any).inputAssessmentStudent.updateMany({
        where: { id: { in: ids } },
        data: {
          periodId: targetPeriodId,
          batchId: targetBatchId || null
        }
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}