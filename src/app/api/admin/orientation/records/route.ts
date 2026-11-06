import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  getStudentOrientationRecord,
  upsertStudentOrientationRecord,
  getAssignedOrientationTeacher,
  getStudentAssignedSurveyTeachers
} from "@/lib/orientation/service";
import { canUserConfirmStage } from "@/lib/entrance-progress/constants";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId" }, { status: 400 });
    }

    const session = await auth();
    const currentUser = session?.user as any;

    const record = await getStudentOrientationRecord(studentId);
    const assignedOrientation = await getAssignedOrientationTeacher(studentId, currentUser?.id);
    let studentInfo = record?.student || null;

    if (!studentInfo) {
      studentInfo = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          fullName: true,
          studentCode: true,
          grade: true,
          dateOfBirth: true,
          gender: true,
          className: true,
          admissionCriteria: true,
          targetType: true,
          surveySystem: true,
          surveyFormType: true,
          admissionCampus: true,
          registeredCampus: true,
          cityName: true,
          districtName: true,
          wardName: true,
          countryName: true,
          oldSchoolName: true,
          oldSchoolType: true,
          hoSoCtQuocTe: true,
          hocKy: true,
          academicRating: true,
          conductRating: true,
          kqHocTap: true,
          kqRenLuyen: true,
          kqgdTieuHoc: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true,
          psychologyScore: true,
          periodId: true,
          batchId: true,
          period: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true
            }
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              name: true,
              status: true,
              campus: {
                select: {
                  id: true,
                  campusName: true,
                  campusCode: true
                }
              }
            }
          },
          scores: {
            include: {
              subject: true
            }
          }
        }
      });
    }

    // Construir danh sách các môn khảo sát đầu vào theo phân công của Giáo viên hiện tại (và các môn khác của HS)
    let assignedSubjectEvaluations: any[] = [];
    if (studentInfo) {
      try {
        const pAny = prisma as any;
        const userRole = String(currentUser?.role || "").toUpperCase();
        const isAdminRole = [
          "ADMIN", "SUPERADMIN", "SUPER_ADMIN",
          "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL",
          "GDCS", "GĐCS", "GD_CS", "GĐ_CS",
          "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"
        ].includes(userRole);

        const stPeriodId = studentInfo.periodId || studentInfo.period?.id;
        const stBatchId = studentInfo.batchId || studentInfo.batch?.id || null;
        const stGradeClean = String(studentInfo.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
        const stSysClean = String(studentInfo.surveyFormType || studentInfo.surveySystem || "").toLowerCase().trim();

        const [periodAssignments, gradeConfigs, sessionExaminers, allSubjects] = await Promise.all([
          stPeriodId
            ? pAny.inputAssessmentTeacherAssignment.findMany({
                where: {
                  periodId: stPeriodId,
                  ...(stBatchId ? { OR: [{ batchId: stBatchId }, { batchId: null }] } : {})
                },
                include: {
                  subject: true,
                  user: { select: { id: true, fullName: true } }
                }
              })
            : Promise.resolve([]),
          pAny.inputAssessmentGradeConfig.findMany({
            where: stPeriodId ? { OR: [{ periodId: stPeriodId }, { periodId: "ALL" }] } : {}
          }).catch(() => []),
          stBatchId
            ? pAny.inputAssessmentSessionExaminer.findMany({
                where: {
                  subjectCode: { not: null },
                  session: {
                    periodId: stPeriodId || undefined,
                    batchId: stBatchId
                  }
                },
                include: {
                  user: { select: { id: true, fullName: true } }
                }
              }).catch(() => [])
            : Promise.resolve([]),
          pAny.assessmentSubject.findMany({ where: { status: "ACTIVE" } }).catch(() => [])
        ]);

        const isExcludedSubject = (subj: any) => {
          const code = String(subj?.code || "").toLowerCase();
          const name = String(subj?.name || "").toLowerCase().normalize("NFC");
          if (!code && !name) return true;
          return (
            code === "tly" || name.includes("tâm lý") ||
            code === "pdhdv" || code === "pvdh" || name.includes("định hướng") || name.includes("phỏng vấn định hướng") ||
            code.includes("cpt") || code.includes("tci") || name.includes("chuẩn phát triển") ||
            code.includes("nltd") || name.includes("năng lực tư duy") ||
            code.includes("probation") || name.includes("học thử")
          );
        };

        const resolveGradeConfig = (subId: string, subObj: any) => {
          const candidates = (gradeConfigs || []).filter((c: any) => c.subjectId === subId);
          let bestMatch: any = null;
          let bestScore = -1;

          for (const c of candidates) {
            let score = 0;
            const cGrade = String(c.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
            const cSys = String(c.educationSystemId || "").toLowerCase().trim();
            const cPeriod = String(c.periodId || "").trim();

            if (cPeriod === stPeriodId) score += 4;
            else if (cPeriod === "ALL" || !cPeriod) score += 1;
            else continue;

            if (cGrade === stGradeClean && stGradeClean !== "") score += 4;
            else if (cGrade === "all" || !cGrade) score += 1;
            else if (stGradeClean !== "") continue;

            if (cSys === stSysClean && stSysClean !== "") score += 2;
            else if (cSys === "all" || !cSys) score += 1;
            else if (stSysClean !== "") continue;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = c;
            }
          }

          let names: string[] = [];
          let types: string[] = [];
          let maxScores: number[] = [];
          let weights: number[] = [];

          if (bestMatch) {
            try { names = typeof bestMatch.columnNames === "string" ? JSON.parse(bestMatch.columnNames || "[]") : (bestMatch.columnNames || []); } catch (e) {}
            try { types = typeof bestMatch.columnTypes === "string" ? JSON.parse(bestMatch.columnTypes || "[]") : (bestMatch.columnTypes || []); } catch (e) {}
            try { maxScores = typeof bestMatch.columnMaxScores === "string" ? JSON.parse(bestMatch.columnMaxScores || "[]") : (bestMatch.columnMaxScores || []); } catch (e) {}
            try { weights = typeof bestMatch.weights === "string" ? JSON.parse(bestMatch.weights || "[]") : (bestMatch.weights || []); } catch (e) {}
          } else if (subObj?.columnNames) {
            try {
              const p = JSON.parse(subObj.columnNames);
              if (Array.isArray(p?.scores)) names = p.scores;
            } catch (e) {}
          }

          const colCount = bestMatch?.columnCount || names.length || subObj?.scoreColumns || 1;
          const subNameLower = String(subObj?.name || "").toLowerCase();
          const defaultMax = subNameLower.includes("vấn đáp") ? 30 : subNameLower.includes("viết") ? 70 : 10;

          while (names.length < colCount) names.push(`Điểm ${names.length + 1}`);
          while (types.length < colCount) types.push(bestMatch?.colType || "SCORE_10");
          while (maxScores.length < colCount) maxScores.push(defaultMax);
          while (weights.length < colCount) weights.push(1);

          const subCodeLower = String(subObj?.code || "").toLowerCase();
          const defaultHasRemark = !(["toa", "tvi", "nva"].some(c => subCodeLower.includes(c)) || ["toán", "tiếng việt", "ngữ văn"].some(s => subNameLower.includes(s)));

          return {
            columnCount: colCount,
            colType: bestMatch?.colType || types[0] || "SCORE_10",
            parsedNames: names,
            parsedTypes: types,
            parsedMaxScores: maxScores,
            parsedWeights: weights,
            hasComposite: Boolean(bestMatch?.hasCompositeColumn),
            compositeColumnName: bestMatch?.compositeColumnName || "Tổng điểm",
            hasRemark: bestMatch ? (bestMatch.hasRemarkColumn !== false && bestMatch.hasRemarkColumn !== 0) : true,
            defaultHasRemark
          };
        };

        const subjectMap = new Map<string, any>();

        // 1. Từ InputAssessmentTeacherAssignment của kỳ/đợt
        for (const ta of periodAssignments) {
          if (!ta.subject || isExcludedSubject(ta.subject)) continue;
          const taGradeNum = String(ta.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
          const isBatchSpecific = Boolean(stBatchId && ta.batchId === stBatchId);
          const gradeMatched = !taGradeNum || taGradeNum === "tất cả" || taGradeNum === stGradeClean || isBatchSpecific;
          if (!gradeMatched) continue;

          const subId = ta.subjectId;
          const isMyAssignment = Boolean(currentUser?.id && ta.userId === currentUser.id);
          const existing = subjectMap.get(subId);

          if (!existing) {
            subjectMap.set(subId, {
              subjectId: subId,
              subjectCode: ta.subject.code,
              subjectName: ta.subject.name,
              isAssignedToMe: isMyAssignment,
              canEdit: isMyAssignment || isAdminRole,
              assignedTeachers: ta.user ? [ta.user.fullName || ta.user.name || "Giáo viên"] : [],
              unlockRequestStatus: ta.unlockRequestStatus || "NONE",
              subjectObj: ta.subject
            });
          } else {
            if (isMyAssignment) {
              existing.isAssignedToMe = true;
              existing.canEdit = true;
            }
            if (ta.unlockRequestStatus === "APPROVED") {
              existing.unlockRequestStatus = "APPROVED";
            }
            const tName = ta.user?.fullName || ta.user?.name;
            if (tName && !existing.assignedTeachers.includes(tName)) {
              existing.assignedTeachers.push(tName);
            }
          }
        }

        // 2. Từ InputAssessmentSessionExaminer (nếu phân công theo ca thi)
        for (const ex of sessionExaminers) {
          const codeNorm = String(ex.subjectCode || "").toLowerCase().trim();
          const matchedSub = allSubjects.find((s: any) =>
            s.id === ex.subjectCode ||
            String(s.code || "").toLowerCase().trim() === codeNorm ||
            String(s.name || "").toLowerCase().trim() === codeNorm
          );
          if (!matchedSub || isExcludedSubject(matchedSub)) continue;
          const subId = matchedSub.id;
          const isMyAssignment = Boolean(currentUser?.id && ex.userId === currentUser.id);
          const existing = subjectMap.get(subId);
          if (!existing) {
            subjectMap.set(subId, {
              subjectId: subId,
              subjectCode: matchedSub.code,
              subjectName: matchedSub.name,
              isAssignedToMe: isMyAssignment,
              canEdit: isMyAssignment || isAdminRole,
              assignedTeachers: ex.user ? [ex.user.fullName || ex.user.name || "Giáo viên"] : [],
              unlockRequestStatus: "NONE",
              subjectObj: matchedSub
            });
          } else if (isMyAssignment) {
            existing.isAssignedToMe = true;
            existing.canEdit = true;
          }
        }

        // 3. Từ điểm đã chấm sẵn của học sinh (studentInfo.scores)
        if (Array.isArray(studentInfo.scores)) {
          for (const sc of studentInfo.scores) {
            if (!sc.subject || isExcludedSubject(sc.subject)) continue;
            const subId = sc.subjectId || sc.subject.id;
            if (!subjectMap.has(subId)) {
              subjectMap.set(subId, {
                subjectId: subId,
                subjectCode: sc.subject.code,
                subjectName: sc.subject.name,
                isAssignedToMe: Boolean(currentUser?.id && sc.teacherId === currentUser.id),
                canEdit: Boolean((currentUser?.id && sc.teacherId === currentUser.id) || isAdminRole),
                assignedTeachers: sc.teacherName ? [sc.teacherName] : [],
                unlockRequestStatus: "NONE",
                subjectObj: sc.subject
              });
            }
          }
        }

        const isPeriodLocked = studentInfo.period?.status ? studentInfo.period.status !== "ACTIVE" : false;
        const isBatchLocked = studentInfo.batch?.status
          ? ["LOCKED", "CLOSED", "COMPLETED"].includes(studentInfo.batch.status)
          : false;

        assignedSubjectEvaluations = Array.from(subjectMap.values()).map((item) => {
          const scoreRecord = (studentInfo.scores || []).find(
            (sc: any) => (sc.subjectId || sc.subject?.id) === item.subjectId
          );
          let scoreVals: string[] = [];
          let commentVals: string[] = [];
          if (scoreRecord?.scores) {
            try {
              const parsed = JSON.parse(scoreRecord.scores);
              if (Array.isArray(parsed)) scoreVals = parsed.map((v: any) => (v !== null && v !== undefined ? String(v) : ""));
            } catch (e) {
              scoreVals = [String(scoreRecord.scores)];
            }
          }
          if (scoreRecord?.comments) {
            try {
              const parsed = JSON.parse(scoreRecord.comments);
              if (Array.isArray(parsed)) commentVals = parsed.map((v: any) => (v !== null && v !== undefined ? String(v) : ""));
            } catch (e) {
              commentVals = [String(scoreRecord.comments)];
            }
          }

          const gradeConfig = resolveGradeConfig(item.subjectId, item.subjectObj);
          const isLocked = !isAdminRole && (isPeriodLocked || isBatchLocked) && item.unlockRequestStatus !== "APPROVED";

          return {
            subjectId: item.subjectId,
            subjectCode: item.subjectCode,
            subjectName: item.subjectName,
            isAssignedToMe: item.isAssignedToMe,
            canEdit: item.canEdit && !isLocked,
            isLocked,
            assignedTeachers: item.assignedTeachers,
            scoredByTeacherName: scoreRecord?.teacherName || "",
            updatedAt: scoreRecord?.updatedAt || null,
            hasScore: scoreVals.some((v) => String(v).trim() !== ""),
            scoreVals,
            commentVals,
            gradeConfig
          };
        }).sort((a, b) => {
          if (a.isAssignedToMe !== b.isAssignedToMe) return a.isAssignedToMe ? -1 : 1;
          if (a.canEdit !== b.canEdit) return a.canEdit ? -1 : 1;
          return String(a.subjectName || "").localeCompare(String(b.subjectName || ""), "vi");
        });
      } catch (evalErr) {
        console.error("Error building assignedSubjectEvaluations:", evalErr);
      }
    }

    if (studentInfo) {
      const isCuid = (v?: string | null) => Boolean(v && /^c[a-z0-9]{15,}$/i.test(String(v).trim()));
      let resolvedCampusLabel =
        studentInfo.batch?.campus?.campusCode ||
        studentInfo.batch?.campus?.campusName ||
        "";

      const rawCampusId = isCuid(studentInfo.admissionCampus)
        ? studentInfo.admissionCampus
        : isCuid(studentInfo.registeredCampus)
        ? studentInfo.registeredCampus
        : null;

      if (!resolvedCampusLabel && rawCampusId) {
        try {
          const foundCampus = await (prisma as any).campus.findUnique({
            where: { id: rawCampusId },
            select: { campusCode: true, campusName: true }
          });
          if (foundCampus) {
            resolvedCampusLabel = foundCampus.campusCode || foundCampus.campusName || "";
          }
        } catch (e) {}
      }

      if (resolvedCampusLabel) {
        if (isCuid(studentInfo.admissionCampus)) {
          studentInfo.admissionCampus = resolvedCampusLabel;
        }
        if (isCuid(studentInfo.registeredCampus)) {
          studentInfo.registeredCampus = resolvedCampusLabel;
        }
      }
    }

    const fallbackTeacherName =
      assignedOrientation.primary?.teacherName ||
      record?.interviewerName ||
      currentUser?.fullName ||
      currentUser?.name ||
      "";

    const assignedSurveyTeachers = await getStudentAssignedSurveyTeachers(studentId);

    return NextResponse.json({
      success: true,
      data: record,
      student: studentInfo,
      assignedOrientationTeacher: assignedOrientation.primary || (fallbackTeacherName ? { teacherName: fallbackTeacherName, teacherId: currentUser?.id || "" } : null),
      assignedOrientationTeachers: assignedOrientation.list || [],
      assignedSurveyTeachers,
      assignedSubjectEvaluations
    });
  } catch (error: any) {
    console.error("GET /api/admin/orientation/records error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentId,
      subjectEvaluations,
      writtenEnglishScore,
      oralEnglishScore,
      mathScore,
      literatureScore,
      gdcsDecision,
      gdcsGeneralNote,
      overallAssessment,
      periodId,
      batchId,
      ...orientationRest
    } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId" }, { status: 400 });
    }

    const user = session.user as any;
    const record = await upsertStudentOrientationRecord({
      studentId,
      ...orientationRest,
      interviewerId: orientationRest.interviewerId || user?.id,
      interviewerName: orientationRest.interviewerName || user?.fullName || user?.name
    });

    // 1. Lưu kết quả chấm điểm các môn theo phân công (nếu được gửi kèm từ Form Định hướng)
    let syncedMathScore = mathScore;
    let syncedLiteratureScore = literatureScore;
    let syncedWrittenEnglishScore = writtenEnglishScore;
    let syncedOralEnglishScore = oralEnglishScore;

    if (Array.isArray(subjectEvaluations) && subjectEvaluations.length > 0) {
      for (const item of subjectEvaluations) {
        if (!item?.subjectId) continue;
        const scoresArr = Array.isArray(item.scores) ? item.scores : [];
        const commentsArr = Array.isArray(item.comments) ? item.comments : [];
        const hasAnyValue =
          scoresArr.some((v: any) => v !== null && v !== undefined && String(v).trim() !== "") ||
          commentsArr.some((v: any) => v !== null && v !== undefined && String(v).trim() !== "");

        if (!hasAnyValue) continue;

        try {
          const existingScore = await prisma.studentAssessmentScore.findUnique({
            where: {
              studentId_subjectId: { studentId, subjectId: item.subjectId }
            },
            include: { subject: true }
          });

          const teacherName = user?.fullName || user?.name || existingScore?.teacherName || "Giáo viên";
          const teacherId = user?.id || existingScore?.teacherId || null;

          const upsertedScore = await prisma.studentAssessmentScore.upsert({
            where: {
              studentId_subjectId: { studentId, subjectId: item.subjectId }
            },
            create: {
              studentId,
              subjectId: item.subjectId,
              scores: JSON.stringify(scoresArr),
              comments: JSON.stringify(commentsArr),
              teacherId,
              teacherName
            },
            update: {
              scores: JSON.stringify(scoresArr),
              comments: JSON.stringify(commentsArr),
              teacherId,
              teacherName
            },
            include: { subject: true }
          });

          const subNameNorm = String(upsertedScore.subject?.name || item.subjectName || "").toLowerCase().normalize("NFC");
          const subCodeNorm = String(upsertedScore.subject?.code || item.subjectCode || "").toLowerCase();
          const firstNumeric = scoresArr.find((v: any) => v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(parseFloat(String(v))));

          if (firstNumeric !== undefined) {
            if (subNameNorm.includes("toán") || subCodeNorm.includes("toa")) {
              syncedMathScore = firstNumeric;
            } else if (subNameNorm.includes("ngữ văn") || subNameNorm.includes("tiếng việt") || subCodeNorm.includes("nva") || subCodeNorm.includes("tvi")) {
              syncedLiteratureScore = firstNumeric;
            } else if (subNameNorm.includes("tiếng anh") || subCodeNorm.includes("eng") || subCodeNorm.includes("esl")) {
              if (subNameNorm.includes("vấn đáp")) {
                syncedOralEnglishScore = firstNumeric;
              } else {
                syncedWrittenEnglishScore = firstNumeric;
              }
            }
          }
        } catch (scoreErr) {
          console.error("Lỗi lưu điểm môn từ Phiếu định hướng:", scoreErr);
        }
      }
    }

    // 2. Đồng bộ điểm các môn khảo sát (kiểu Float) & Quyết định/chỉ đạo của GĐCS vào InputAssessmentStudent
    try {
      const parseOptionalFloat = (val: any): number | null | undefined => {
        if (val === undefined) return undefined;
        if (val === null || String(val).trim() === "" || String(val).trim() === "—") return null;
        const num = parseFloat(String(val).replace(",", "."));
        return Number.isFinite(num) ? num : undefined;
      };

      const studentUpdates: any = {};
      const wEng = parseOptionalFloat(syncedWrittenEnglishScore);
      if (wEng !== undefined) studentUpdates.writtenEnglishScore = wEng;

      const oEng = parseOptionalFloat(syncedOralEnglishScore);
      if (oEng !== undefined) studentUpdates.oralEnglishScore = oEng;

      const mScore = parseOptionalFloat(syncedMathScore);
      if (mScore !== undefined) studentUpdates.mathScore = mScore;

      const lScore = parseOptionalFloat(syncedLiteratureScore);
      if (lScore !== undefined) studentUpdates.literatureScore = lScore;

      // Kiểm soát: Không tự động phê duyệt kết luận nếu người lưu chỉ là Giáo viên nhập điểm/định hướng
      const canApproveStage6 = canUserConfirmStage(user?.role, 6, Boolean(user?.isSuperAdmin));
      if (gdcsDecision && canApproveStage6) {
        if (gdcsDecision === "TIEP_NHAN_CHUAN") {
          studentUpdates.admissionResult = "Đạt";
        } else if (gdcsDecision === "TIEP_NHAN_DONG_HANH") {
          studentUpdates.admissionResult = "Đạt có cam kết";
        } else if (gdcsDecision === "TAM_HOAN_DANH_GIA") {
          studentUpdates.admissionResult = "Chờ duyệt";
        }
      }
      if (gdcsGeneralNote !== undefined && gdcsGeneralNote !== null && canApproveStage6) {
        studentUpdates.directorNote = gdcsGeneralNote;
      }
      if (orientationRest.proposedEduSystem) {
        studentUpdates.surveyFormType = orientationRest.proposedEduSystem;
      }

      if (Object.keys(studentUpdates).length > 0) {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: studentUpdates
        });
      }

      // Đồng bộ Tiến độ Công đoạn 5 (Hoàn thành bản định hướng kết quả)
      if ((record as any)?.status === "COMPLETED" || orientationRest.status === "COMPLETED") {
        await executeEntranceWorkflowAction({
          action: "CONFIRM",
          targetScope: "STUDENT",
          periodId: (record as any)?.student?.periodId || periodId || "PERIOD_ORIENTATION",
          batchId: (record as any)?.student?.batchId || batchId || null,
          studentIds: [studentId],
          stageNumber: 5,
          status: "COMPLETED",
          note: overallAssessment || "Hoàn thành phiếu định hướng đầu vào",
          actor: {
            id: user?.id || "interviewer",
            fullName: user?.fullName || user?.name || "Giáo viên định hướng",
            role: user?.role || "TEACHER",
            isSuperAdmin: Boolean(user?.isSuperAdmin),
          },
        });
      }
    } catch (syncErr) {
      console.error("Lỗi đồng bộ sang InputAssessmentStudent:", syncErr);
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("POST /api/admin/orientation/records error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
