// @ts-nocheck
// Teacher assessments route
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getSurveyFormAgeGroup, getProbationAgeGroup } from "@/lib/preschool"
import { ensureTciSchema, getTciDb } from "@/lib/tci/schema-init"
import { ensurePvdhSchema, getPvdhDb } from "@/lib/pvdh/schema-init"

function matchesPreschoolGrade(stGradeOrAgeGroup, taGrade) {
    const st = (stGradeOrAgeGroup || "").toLowerCase().trim();
    const ta = (taGrade || "").toLowerCase().trim();
    if (!ta || ta === "tất cả") return true;
    if (st === ta) return true;

    const cleanTa = ta.replace("khối", "").trim();
    const cleanSt = st.replace("khối", "").trim();
    if (cleanSt === cleanTa) return true;

    const equivalenceGroups = {
        "12 đến 18 tháng": ["12 đến 18 tháng"],
        "nhà trẻ 12-18 tháng": ["12 đến 18 tháng"],
        "18 đến 24 tháng": ["18 đến 24 tháng", "24 đến 36 tháng"],
        "nhà trẻ 18-24 tháng": ["18 đến 24 tháng", "24 đến 36 tháng"],
        "24 đến 36 tháng": ["18 đến 24 tháng", "24 đến 36 tháng", "mẫu giáo bé"],
        "nhà trẻ 24-36 tháng": ["18 đến 24 tháng", "24 đến 36 tháng", "mẫu giáo bé"],
        "mẫu giáo bé": ["mẫu giáo bé", "24 đến 36 tháng", "3 đến 4 tuổi"],
        "3 đến 4 tuổi": ["mẫu giáo bé", "mẫu giáo nhỡ", "3 đến 4 tuổi"],
        "mẫu giáo nhỡ": ["mẫu giáo nhỡ", "3 đến 4 tuổi", "4 đến 5 tuổi"],
        "4 đến 5 tuổi": ["mẫu giáo nhỡ", "mẫu giáo lớn", "4 đến 5 tuổi"],
        "mẫu giáo lớn": ["mẫu giáo lớn", "4 đến 5 tuổi", "5 đến 6 tuổi"],
        "5 đến 6 tuổi": ["mẫu giáo lớn", "5 đến 6 tuổi"]
    };

    const allowedTAs = equivalenceGroups[cleanSt] || [];
    return allowedTAs.some(allowed => allowed === cleanTa || allowed.includes(cleanTa) || cleanTa.includes(allowed));
}


export async function GET(req: any) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    if (action === "getGradeConfigs") {
        const academicYearId = searchParams.get("academicYearId");
        const pAny = prisma as any;
        try {
            const [configs, eduSystems] = await Promise.all([
                pAny.inputAssessmentGradeConfig.findMany({
                    where: {
                        ...(academicYearId ? { academicYearId } : {})
                    }
                }),
                pAny.educationSystem ? pAny.educationSystem.findMany({
                    select: { id: true, code: true, name: true }
                }).catch(() => []) : []
            ]);
            const sysById = new Map((eduSystems || []).map((s: any) => [s.id, s]));
            const enriched = (configs || []).map((c: any) => {
                const rawSys = c.educationSystemId || "ALL";
                const resolved: any = sysById.get(rawSys);
                return {
                    ...c,
                    educationSystemCode: resolved?.code || rawSys
                };
            });
            return NextResponse.json(enriched);
        } catch (e: any) {
            console.error("Error getGradeConfigs in teacher API:", e);
            return NextResponse.json([]);
        }
    }

    if (action === "getAssignments") {
        const academicYearId = searchParams.get("academicYearId");
        const userRole = ((session?.user as any)?.role || "").toUpperCase();
        const isAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);
        
        let whereClause: any = {};
        if (!isAdmin) {
            whereClause.userId = session.user.id;
        }
        if (academicYearId) {
            whereClause.period = { academicYearId: academicYearId };
        }

        const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: whereClause,
            include: {
                subject: true,
                batch: true,
                period: { include: { assignedUser: true } }
            }
        });

        // Fetch preschool assignments (filter by userId only for teachers; admins see all)
        const preschoolAssignmentsRaw = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
            where: isAdmin ? {} : {
                OR: [
                    { userId: session.user.id },
                    { delegatedUserId: session.user.id }
                ]
            },
            include: {
                batch: true,
                period: { include: { assignedUser: true } }
            }
        });

        // Tự động lấy cấu hình phân công GV giảng dạy có môn Cam kết để đề xuất/đánh giá
        const periods = await prisma.inputAssessmentPeriod.findMany({
            where: { ...(academicYearId ? { academicYearId } : {}) }
        });

        const currentTeacherForAss = await prisma.teacher.findUnique({
            where: { userId: session.user.id }
        });
        
        let synthesizedAssignments = [];
        if (currentTeacherForAss) {
            const teachingAssignments = await prisma.teachingAssignment.findMany({
                where: {
                    teacherId: currentTeacherForAss.id,
                    ...(academicYearId ? { academicYearId } : {})
                },
                include: {
                    class: true,
                    subject: true
                }
            });

            const targetStudents = await prisma.learningSupportTarget.findMany({
                where: {
                    supportType: "ACADEMIC",
                    terminationStatus: { not: "TERMINATED" },
                    ...(academicYearId ? { academicYearId } : {}),
                    student: {
                        classId: { in: teachingAssignments.map(ta => ta.classId) }
                    }
                },
                include: {
                    student: true
                }
            });

            const commitmentStudents = await prisma.studentLearningCommitment.findMany({
                where: {
                    status: "ACTIVE",
                    ...(academicYearId ? { academicYearId } : {}),
                    student: {
                        classId: { in: teachingAssignments.map(ta => ta.classId) }
                    }
                },
                include: {
                    student: true
                }
            });

            for (const p of periods) {
                for (const ta of teachingAssignments) {
                    const studentClassId = ta.classId;
                    const subName = (ta.subject?.subjectName || ta.subject?.name || "").toLowerCase();

                    const hasCommitments = targetStudents.some(ts => {
                        if (ts.student?.classId !== studentClassId) return false;
                        const reason = (ts.reason || "").toLowerCase();
                        return reason.includes(subName) || subName.includes(reason);
                    }) || commitmentStudents.some(cs => {
                        if (cs.student?.classId !== studentClassId) return false;
                        const content = (cs.content || "").toLowerCase();
                        return content.includes(subName) || subName.includes(content);
                    });

                    if (hasCommitments) {
                        const className = ta.class?.className || "";
                        let gradeStr = className;
                        const match = className.match(/^(\d+)/);
                        if (match) {
                            gradeStr = `Khối ${match[1]}`;
                        }

                        synthesizedAssignments.push({
                            id: `synthesized_${ta.id}_${p.id}`,
                            periodId: p.id,
                            batchId: null,
                            userId: session.user.id,
                            subjectId: ta.subjectId,
                            grade: gradeStr,
                            isPreschool: false,
                            subject: ta.subject,
                            period: {
                                id: p.id,
                                name: p.name,
                                code: p.code,
                                academicYearId: p.academicYearId
                            }
                        });
                    }
                }
            }
        }

        const combinedAssignments = [...assignments];
        synthesizedAssignments.forEach(sa => {
            const exists = combinedAssignments.some(a => 
                a.periodId === sa.periodId && 
                a.subjectId === sa.subjectId && 
                (a.grade || "").toLowerCase().trim() === (sa.grade || "").toLowerCase().trim()
            );
            if (!exists) {
                combinedAssignments.push(sa);
            }
        });

        // Đồng bộ thêm phân công từ Phiên / Lịch ca thi (InputAssessmentSessionExaminer có gán subjectCode) nếu chưa có trong InputAssessmentTeacherAssignment
        try {
            const sessionExaminers = await (prisma as any).inputAssessmentSessionExaminer.findMany({
                where: {
                    ...(isAdmin ? {} : { userId: session.user.id }),
                    subjectCode: { not: null }
                },
                include: {
                    session: {
                        include: {
                            batch: true,
                            period: { include: { assignedUser: true } },
                            studentSessions: { include: { student: true } }
                        }
                    }
                }
            });
            if (sessionExaminers.length > 0) {
                const allAssessmentSubjects = await prisma.assessmentSubject.findMany();
                for (const ex of sessionExaminers) {
                    const sess = ex.session;
                    if (!sess || !sess.periodId) continue;
                    if (academicYearId && sess.academicYearId && sess.academicYearId !== academicYearId) continue;
                    const subCodeNorm = String(ex.subjectCode || "").toLowerCase().trim();
                    const matchedSub = allAssessmentSubjects.find(s =>
                        s.id === ex.subjectCode ||
                        String(s.code || "").toLowerCase().trim() === subCodeNorm ||
                        String(s.name || "").toLowerCase().trim() === subCodeNorm
                    );
                    if (!matchedSub) continue;
                    const firstSt = sess.studentSessions?.[0]?.student;
                    const stGrade = firstSt?.grade || "Tất cả";
                    const stSys = firstSt?.surveyFormType || "Tất cả";
                    const alreadyExists = combinedAssignments.some(a =>
                        a.periodId === sess.periodId &&
                        (a.batchId || null) === (sess.batchId || null) &&
                        a.subjectId === matchedSub.id
                    );
                    if (!alreadyExists) {
                        combinedAssignments.push({
                            id: `session_ex_${ex.id}`,
                            periodId: sess.periodId,
                            batchId: sess.batchId || null,
                            userId: ex.userId,
                            subjectId: matchedSub.id,
                            grade: stGrade,
                            educationSystem: stSys,
                            createdAt: sess.updatedAt || sess.createdAt,
                            subject: matchedSub,
                            batch: sess.batch || null,
                            period: sess.period
                        });
                    }
                }
            }
        } catch (exErr) {
            console.error("Sync session examiner assignments error:", exErr);
        }

        // Query counts for general K12 students
        const generalPeriodIds = Array.from(new Set(combinedAssignments.map(a => a.periodId).filter(Boolean)));
        const generalStudents = generalPeriodIds.length > 0 ? await prisma.inputAssessmentStudent.findMany({
            where: { periodId: { in: generalPeriodIds } },
            select: { id: true, periodId: true, batchId: true, grade: true, surveyFormType: true }
        }) : [];

        const sysList = await prisma.educationSystem.findMany();
        const eduSystemsMap = {};
        sysList.forEach(s => {
            const code = s.code.toLowerCase();
            if (!eduSystemsMap[code]) eduSystemsMap[code] = new Set();
            eduSystemsMap[code].add(s.name.toLowerCase());
        });

        const K12AssignmentsWithCount = combinedAssignments.map(a => {
            const aGrade = (a.grade || "").toLowerCase().trim();
            const aGradeNum = aGrade.replace("khối", "").trim();
            const aSys = (a.educationSystem || "").toLowerCase().trim();
            const aSysNames = eduSystemsMap[aSys] || new Set();

            const strictMatches = generalStudents.filter(st => {
                if (st.periodId !== a.periodId) return false;
                if (a.batchId && st.batchId !== a.batchId) return false;

                const stGrade = (st.grade || "").toLowerCase().trim();
                const stGradeNum = stGrade.replace("khối", "").trim();
                const stSys = (st.surveyFormType || "").toLowerCase().trim();

                const gradeMatch = !aGrade || aGrade === "tất cả" || stGrade === aGrade ||
                    (stGradeNum !== "" && aGradeNum !== "" && stGradeNum === aGradeNum);

                let sysMatch = false;
                if (!aSys || aSys === "tất cả") {
                    sysMatch = true;
                } else {
                    sysMatch = stSys === aSys || stSys.includes(aSys) || aSys.includes(stSys);
                    if (!sysMatch) {
                        for (const name of aSysNames) {
                            if (stSys === name || stSys.includes(name) || name.includes(stSys)) {
                                sysMatch = true;
                                break;
                            }
                        }
                    }
                }
                return gradeMatch && sysMatch;
            });

            // Nếu phân công gắn trực tiếp vào 1 Đợt khảo sát cụ thể (a.batchId) mà khối mặc định bị lệch so với HS trong đợt đó, tự động nhận diện HS trong đợt
            let finalCount = strictMatches.length;
            let resolvedGrade = a.grade;
            let resolvedSys = a.educationSystem;

            if (finalCount === 0 && a.batchId) {
                const batchStudents = generalStudents.filter(
                    st => st.periodId === a.periodId && st.batchId === a.batchId
                );
                if (batchStudents.length > 0) {
                    finalCount = batchStudents.length;
                    if (batchStudents[0].grade) {
                        resolvedGrade = String(batchStudents[0].grade).replace(/^Khối\s+/i, "").trim();
                    }
                    if (batchStudents[0].surveyFormType) {
                        resolvedSys = batchStudents[0].surveyFormType;
                    }
                }
            }

            return {
                ...a,
                grade: resolvedGrade,
                educationSystem: resolvedSys,
                studentCount: finalCount
            };
        });

        // Filter by academicYear in-memory (relation filter may not work on preschool model)
        const preschoolAssignments = academicYearId
            ? preschoolAssignmentsRaw.filter((a: any) => a.period?.academicYearId === academicYearId)
            : preschoolAssignmentsRaw;

        // Query counts for preschool students
        const preschoolPeriodIds = Array.from(new Set(preschoolAssignments.map((a: any) => a.periodId).filter(Boolean)));
        const preschoolStudents = preschoolPeriodIds.length > 0 ? await (prisma as any).preschoolInputAssessmentStudent.findMany({
            where: { periodId: { in: preschoolPeriodIds } },
            select: { id: true, periodId: true, batchId: true, grade: true, probationaryTeacher: true, admissionResult: true }
        }) : [];

        const mappedPreschool = preschoolAssignments.map((a: any) => {
            const rawGradeUp = String(a.grade || "").trim().toUpperCase();
            const isHealthB4A = rawGradeUp === "Y_TE_B4A" || rawGradeUp.includes("Y_TE") || String(a.grade || "").toLowerCase().includes("y tế");
            const isProbation = !isHealthB4A && (a.grade === "Mẫu phiếu học thử" || a.grade === "Học thử" || a.grade === "Học trải nghiệm");
            const studentCount = preschoolStudents.filter((st: any) => {
                if (st.periodId !== a.periodId) return false;
                if (a.batchId && st.batchId !== a.batchId) return false;
                if (isHealthB4A) return true;
                if (isProbation) {
                    return st.admissionResult === "Học thử" || st.probationaryTeacher === currentTeacherForAss?.teacherName;
                }
                return matchesPreschoolGrade(st.grade || "", a.grade);
            }).length;

            const resolvedSubjId = isHealthB4A
                ? "preschool-health"
                : isProbation
                  ? "preschool-probation"
                  : "preschool";

            return {
                id: a.id,
                periodId: a.periodId,
                batchId: a.batchId,
                userId: a.userId,
                subjectId: resolvedSubjId,
                grade: isHealthB4A ? "Y tế (B4A)" : isProbation ? "Học trải nghiệm" : a.grade,
                isPreschool: true,
                isPreschoolHealth: isHealthB4A ? true : undefined,
                isPreschoolProbation: isProbation ? true : undefined,
                studentCount,
                subject: {
                    id: resolvedSubjId,
                    name: isHealthB4A
                        ? "B4A: Y tế kiểm tra thể chất (Mầm non)"
                        : isProbation
                          ? "Đánh giá Học trải nghiệm (Mầm non)"
                          : "Đánh giá Mầm non",
                    code: isHealthB4A ? "B4A_YTE" : isProbation ? "PRESCHOOL_PROBATION" : "PRESCHOOL",
                    scoreColumns: 1,
                    commentColumns: 1,
                },
                batch: a.batch ? {
                    id: a.batch.id,
                    name: a.batch.name,
                    status: a.batch.status
                } : null,
                period: {
                    id: a.period.id,
                    name: a.period.name,
                    code: a.period.code,
                    status: a.period.status,
                    assignedUser: a.period.assignedUser ? {
                        id: a.period.assignedUser.id,
                        fullName: a.period.assignedUser.fullName,
                        email: a.period.assignedUser.email
                    } : null
                }
            };
        });

        try {
            const currentTeacher = await prisma.teacher.findUnique({
                where: { userId: session.user.id }
            });
            const candidateTeacherNames = Array.from(
                new Set([currentTeacher?.teacherName, (session.user as any)?.fullName, (session.user as any)?.name].filter(Boolean))
            ) as string[];
            const currentUserEmail = String((session.user as any)?.email || "").trim().toLowerCase();

            // 1. Virtual assignments cho GV phụ trách B6 Học trải nghiệm (Mầm non)
            if (candidateTeacherNames.length > 0 || isAdmin) {
                const probationStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                    where: {
                        ...(isAdmin
                            ? {
                                  OR: [
                                      { probationaryTeacher: { not: null } },
                                      { bghApprovalStatus: { in: ["HEN_TRAI_NGHIEM", "DAT_HOC_THU"] } },
                                  ],
                              }
                            : { probationaryTeacher: { in: candidateTeacherNames } }),
                        ...(academicYearId ? { period: { academicYearId } } : {})
                    },
                    select: {
                        id: true,
                        periodId: true,
                        period: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                status: true,
                                assignedUser: { select: { id: true, fullName: true, email: true } }
                            }
                        }
                    }
                });

                const probByPeriod = new Map<string, { period: any; count: number }>();
                for (const st of probationStudents || []) {
                    if (!st.period) continue;
                    const cur = probByPeriod.get(st.periodId) || { period: st.period, count: 0 };
                    cur.count += 1;
                    probByPeriod.set(st.periodId, cur);
                }

                probByPeriod.forEach(({ period, count }, pid) => {
                    if (!mappedPreschool.some((m: any) => m.periodId === pid && m.subjectId === "preschool-probation")) {
                        mappedPreschool.push({
                            id: "preschool-probation-" + pid,
                            periodId: pid,
                            batchId: null,
                            userId: session.user.id,
                            subjectId: "preschool-probation",
                            grade: "Học trải nghiệm",
                            isPreschool: true,
                            isPreschoolProbation: true,
                            studentCount: count,
                            subject: {
                                id: "preschool-probation",
                                name: "Đánh giá Học trải nghiệm (Mầm non)",
                                code: "PRESCHOOL_PROBATION",
                                scoreColumns: 1,
                                commentColumns: 1,
                            },
                            batch: null,
                            period
                        });
                    }
                });
            }

            // 2. Virtual assignments cho GV Tâm lý phụ trách B7 Khảo sát tâm lý (Mầm non · BM.KTĐBCL.09)
            try {
                const psyRows = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT s."id", s."periodId", s."trialPsychologistId", s."trialPsychologistEmail",
                            s."trialPsychologistName", s."trialPsychologyScreening"
                     FROM "PreschoolInputAssessmentStudent" s
                     WHERE s."trialPsychologyScreening" = 1
                        OR s."trialPsychologistId" IS NOT NULL
                        OR s."trialPsychologistName" IS NOT NULL`
                );
                const matchedPsyPeriodCounts = new Map<string, number>();
                for (const r of psyRows || []) {
                    if (!r.periodId) continue;
                    const emailMatch = currentUserEmail && String(r.trialPsychologistEmail || "").trim().toLowerCase() === currentUserEmail;
                    const idMatch = r.trialPsychologistId && r.trialPsychologistId === session.user.id;
                    const nameMatch = r.trialPsychologistName && candidateTeacherNames.includes(String(r.trialPsychologistName).trim());
                    if (isAdmin || idMatch || emailMatch || nameMatch) {
                        matchedPsyPeriodCounts.set(r.periodId, (matchedPsyPeriodCounts.get(r.periodId) || 0) + 1);
                    }
                }
                if (matchedPsyPeriodCounts.size > 0) {
                    const psyPeriods = await (prisma as any).preschoolInputAssessmentPeriod.findMany({
                        where: {
                            id: { in: Array.from(matchedPsyPeriodCounts.keys()) },
                            ...(academicYearId ? { academicYearId } : {}),
                        },
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            status: true,
                            assignedUser: { select: { id: true, fullName: true, email: true } },
                        },
                    });
                    for (const p of psyPeriods || []) {
                        mappedPreschool.push({
                            id: "preschool-psychology-" + p.id,
                            periodId: p.id,
                            batchId: null,
                            userId: session.user.id,
                            subjectId: "preschool-psychology",
                            grade: "Khảo sát tâm lý",
                            isPreschool: true,
                            isPreschoolPsychology: true,
                            studentCount: matchedPsyPeriodCounts.get(p.id) || 0,
                            subject: {
                                id: "preschool-psychology",
                                name: "Khảo sát Tâm lý (Mầm non · BM.KTĐBCL.09)",
                                code: "PRESCHOOL_PSYCHOLOGY",
                                scoreColumns: 1,
                                commentColumns: 1,
                            },
                            batch: null,
                            period: p,
                        });
                    }
                }
            } catch (psyErr) {
                console.error("Error fetching virtual psychology assignments:", psyErr);
            }
        } catch (eError) {
            console.error("Error fetching virtual probationary assignments:", eError);
        }

        return NextResponse.json([...K12AssignmentsWithCount, ...mappedPreschool].filter((a: any) => a?.batch?.status !== "COMPLETED"));
    }
    
    if (action === "getStats") {
        const academicYearId = searchParams.get("academicYearId");
        if (!academicYearId) {
            return NextResponse.json({ total: 0, grades: {} });
        }

        const userRole = ((session?.user as any)?.role || "").toUpperCase();
        const isAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);

        const currentTeacher = await prisma.teacher.findUnique({
            where: { userId: session.user.id }
        });

        if (!currentTeacher && !isAdmin) {
            return NextResponse.json({ total: 0, grades: {} });
        }

        const teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: {
                ...(isAdmin ? {} : { userId: session.user.id }),
                period: { academicYearId: academicYearId }
            }
        });

        const preschoolAssignmentsRaw = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
            where: isAdmin ? {} : {
                OR: [
                    { userId: session.user.id },
                    { delegatedUserId: session.user.id }
                ]
            },
            include: { period: true }
        });
        const preschoolAssignments = preschoolAssignmentsRaw.filter((a: any) => a.period?.academicYearId === academicYearId);

        const generalPeriods = Array.from(new Set(teacherAssignments.map(ta => ta.periodId)));
        const generalGrades = Array.from(new Set(teacherAssignments.map(ta => ta.grade).filter(Boolean)));

        let generalStudents = [];
        if (generalPeriods.length > 0) {
            generalStudents = await prisma.inputAssessmentStudent.findMany({
                where: {
                    periodId: { in: generalPeriods },
                    ...(generalGrades.length > 0 && !generalGrades.includes("tất cả") && !generalGrades.includes("Tất cả") ? {
                        grade: { in: generalGrades }
                    } : {})
                },
                select: { id: true, grade: true }
            });
        }

        const preschoolPeriods = Array.from(new Set(preschoolAssignments.map(pa => pa.periodId)));
        const preschoolGrades = Array.from(new Set(preschoolAssignments.map(pa => pa.grade).filter(Boolean)));

        let preschoolStudents = [];
        if (preschoolPeriods.length > 0) {
            preschoolStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                where: {
                    periodId: { in: preschoolPeriods },
                    ...(preschoolGrades.length > 0 && !preschoolGrades.includes("tất cả") && !preschoolGrades.includes("Tất cả") ? {
                        grade: { in: preschoolGrades }
                    } : {})
                },
                select: { id: true, grade: true }
            });
        }

        const uniqueGeneral = new Map();
        generalStudents.forEach(st => {
            uniqueGeneral.set(st.id, st.grade);
        });

        const uniquePreschool = new Map();
        preschoolStudents.forEach(st => {
            uniquePreschool.set(st.id, st.grade);
        });

        const gradeCounts = {};
        let total = 0;

        uniqueGeneral.forEach((grade) => {
            const rawGrade = (grade || "").trim();
            const displayGrade = rawGrade.startsWith("Khối") ? rawGrade : `Khối ${rawGrade}`;
            gradeCounts[displayGrade] = (gradeCounts[displayGrade] || 0) + 1;
            total++;
        });

        uniquePreschool.forEach((grade) => {
            const rawGrade = (grade || "").trim();
            const displayGrade = rawGrade.toLowerCase().includes("mầm non") || rawGrade.toLowerCase().includes("nhà trẻ") || rawGrade.toLowerCase().includes("mẫu giáo") ? rawGrade : (rawGrade.startsWith("Khối") ? rawGrade : `Khối ${rawGrade}`);
            gradeCounts[displayGrade] = (gradeCounts[displayGrade] || 0) + 1;
            total++;
        });

        return NextResponse.json({ total, grades: gradeCounts });
    }

    if (action === "getCampuses") {
        const campuses = await prisma.campus.findMany({
            select: {
                id: true,
                campusCode: true,
                campusName: true
            }
        });
        return NextResponse.json(campuses);
    }
    
    if (action === "getDashboardMetrics") {
        const academicYearId = searchParams.get("academicYearId");
        
        // 1. Parallel initial query: teacher record, academic year, total assignments count
        const [teacher, targetYear, totalAssignments] = await Promise.all([
            prisma.teacher.findUnique({
                where: { userId: session.user.id },
                select: {
                    id: true,
                    teacherCode: true,
                    teacherName: true,
                    homeroomClass: true,
                    position: true,
                    positions: true,
                    campusId: true,
                    campus: {
                        select: {
                            id: true,
                            campusCode: true,
                            campusName: true
                        }
                    },
                    mainSubjectRel: {
                        select: {
                            id: true,
                            subjectName: true,
                            subjectCode: true
                        }
                    },
                    departmentId: true,
                    departmentRel: {
                        select: {
                            id: true,
                            name: true,
                            blockCM: true
                        }
                    },
                    departmentAssignments: {
                        select: {
                            id: true,
                            departmentId: true,
                            position: true,
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                    blockCM: true
                                }
                            }
                        }
                    },
                    divisionAssignments: {
                        select: {
                            id: true,
                            divisionCode: true,
                            roleInDivision: true
                        }
                    }
                }
            }),
            academicYearId
                ? prisma.academicYear.findUnique({ where: { id: academicYearId } })
                : prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }),
            prisma.inputAssessmentTeacherAssignment.count({
                where: { userId: session.user.id }
            })
        ]);

        if (!teacher) {
            return NextResponse.json({
                totalClasses: 0,
                totalStudents: 0,
                totalAssignments,
                scoredStudents: 0,
                academicYearName: targetYear?.name || "",
                totalObservedLessons: 0,
                remedialStudentsCount: 0
            });
        }

        const targetYearId = targetYear?.id || null;
        const academicYearName = targetYear?.name || "";

        // Build slot filter for observation registrations
        const slotAndConditions: any[] = [
            { status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "OPEN", "EXPIRED", "COMPLETED"] } }
        ];

        if (targetYear) {
            const yearOrConditions: any[] = [
                { academicYearId: targetYear.id },
                { academicYearId: null }
            ];
            if (targetYear.startDate && targetYear.endDate) {
                yearOrConditions.push({
                    date: {
                        gte: targetYear.startDate,
                        lte: targetYear.endDate
                    }
                });
            }
            slotAndConditions.push({ OR: yearOrConditions });
        }

        // 2. Parallel secondary query: homeroom classes, teaching assignments, observation registrations
        const [homeroomClasses, teachingAssignments, observedRegs] = await Promise.all([
            prisma.class.findMany({
                where: {
                    OR: [
                        { homeroomTeacherId: teacher.id },
                        { homeroomTeacherId: { contains: teacher.id } }
                    ],
                    ...(targetYearId ? { academicYearId: targetYearId } : {})
                },
                select: {
                    id: true,
                    students: { select: { id: true } }
                }
            }),
            prisma.teachingAssignment.findMany({
                where: {
                    teacherId: teacher.id,
                    ...(targetYearId ? { academicYearId: targetYearId } : {})
                },
                select: { classId: true }
            }),
            prisma.observationRegistration.findMany({
                where: {
                    teacherId: teacher.id,
                    isApproved: true,
                    evaluation: { isNot: null },
                    slot: {
                        AND: slotAndConditions
                    }
                },
                select: {
                    slot: {
                        select: { isDoublePeriod: true }
                    }
                }
            })
        ]);

        const homeroomClassesCount = homeroomClasses.length;
        const homeroomStudentsCount = homeroomClasses.reduce((sum, c) => sum + (c.students?.length || 0), 0);
        const totalObservedLessons = observedRegs.reduce((sum, reg) => sum + (reg.slot?.isDoublePeriod ? 2 : 1), 0);

        const teacherClassIds = Array.from(new Set([
            ...teachingAssignments.map((a: any) => a.classId),
            ...homeroomClasses.map((c: any) => c.id)
        ]));

        const homeroomStudentIds = new Set(
            homeroomClasses.flatMap(c => (c.students || []).map((s: any) => s.id))
        );

        // 3. Fast query for remedial targets with projected fields only
        const targets = await prisma.learningSupportTarget.findMany({
            where: {
                ...(targetYearId ? { academicYearId: targetYearId } : {}),
                OR: [
                    { createdById: teacher.id },
                    { assignments: { some: { teacherId: teacher.id } } },
                    ...(teacherClassIds.length > 0 ? [{ student: { classId: { in: teacherClassIds } } }] : [])
                ]
            },
            select: {
                studentId: true,
                supportType: true,
                sourceType: true,
                notes: true,
                createdById: true,
                assignments: { select: { teacherId: true } },
                student: { select: { id: true, classId: true } }
            }
        });

        const seenKeys = new Set<string>();
        const filteredTargets = targets.filter(t => {
            const isCommitmentTarget = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"));
            const isCreatedByMe = t.createdById === teacher.id;
            const isAssignedToMe = t.assignments?.some((a: any) => a.teacherId === teacher.id);
            const isHomeroomStudent = homeroomStudentIds.has(t.studentId);
            const isClassTeacher = teacherClassIds.includes(t.student?.classId);

            const isCKDV = isCommitmentTarget && (isHomeroomStudent || isClassTeacher);
            const isBSTD = !isCommitmentTarget && (isCreatedByMe || isAssignedToMe);

            if (!isCKDV && !isBSTD) return false;

            const targetCategory = isCommitmentTarget ? "CKDV" : "BSTD";
            const dedupeKey = `${t.studentId}_${t.supportType}_${targetCategory}`;
            if (seenKeys.has(dedupeKey)) return false;
            seenKeys.add(dedupeKey);

            return true;
        });

        const remedialStudentsCount = new Set(filteredTargets.map(t => t.studentId)).size;

        const sessionRole = ((session.user as any)?.role || "").toUpperCase().trim();
        const isTTCM = (teacher.departmentAssignments || []).some((da: any) => 
            ["TTCM", "TPCM", "TO_TRUONG", "TO_PHO"].includes((da.position || "").toUpperCase().trim()) ||
            (da.position || "").toLowerCase().includes("tổ trưởng") ||
            (da.position || "").toLowerCase().includes("tổ phó")
        ) || (teacher.position || "").toLowerCase().includes("tổ trưởng") || (teacher.positions || "").toLowerCase().includes("tổ trưởng");

        const isTBP = ((teacher.divisionAssignments || []).length > 0) ||
            (teacher.position || "").toLowerCase().includes("trưởng bộ phận") ||
            (teacher.positions || "").toLowerCase().includes("trưởng bộ phận");

        const isBGH = ["ADMIN", "SUPER_ADMIN", "BGH", "BGH_MN", "BAN_DHCM", "KT_DBCL"].includes(sessionRole) ||
            (teacher.position || "").toLowerCase().includes("hiệu trưởng") ||
            (teacher.position || "").toLowerCase().includes("ban giám hiệu") ||
            (teacher.position || "").toLowerCase().includes("ban đhcm");

        const isManagerRole = isTTCM || isTBP || isBGH || ["ADMIN", "SUPER_ADMIN", "TTCM", "TBP", "BGH", "BAN_DHCM"].includes(sessionRole);

        let managedDepartmentName: string | null = null;
        let managedDepartmentId: string | null = null;
        let managedTeachersCount = 0;
        let managedDeptObservedCount = 0;

        if (isManagerRole) {
            const primaryDeptAssignment = teacher.departmentAssignments?.[0];
            const deptId = primaryDeptAssignment?.departmentId || teacher.departmentId;
            if (deptId) {
                managedDepartmentId = deptId;
                const dept = await prisma.department.findUnique({
                    where: { id: deptId },
                    select: {
                        id: true,
                        name: true,
                        teachers: { select: { id: true } }
                    }
                });
                if (dept) {
                    managedDepartmentName = dept.name;
                    managedTeachersCount = dept.teachers?.length || 0;
                    const deptTeacherIds = dept.teachers.map((t: any) => t.id);
                    if (deptTeacherIds.length > 0) {
                        managedDeptObservedCount = await prisma.observationRegistration.count({
                            where: {
                                teacherId: { in: deptTeacherIds },
                                isApproved: true,
                                evaluation: { isNot: null },
                                slot: { AND: slotAndConditions }
                            }
                        }).catch(() => 0);
                    }
                }
            }
        }

        // 4. Tổng hợp phân công Phỏng vấn định hướng (Mầm non & Phổ thông) kèm Kỳ, Đợt, Số lượng HS khảo sát
        const blockCMClean = (teacher.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const deptNameClean = (teacher.departmentRel?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const isPreschoolTeacher =
            ["GV_MN", "BGH_MN", "MN", "MAM_NON", "BGH MAM NON", "BGH_MAM_NON"].includes(sessionRole) ||
            blockCMClean.includes("mam non") ||
            deptNameClean.includes("mam non") ||
            (teacher.departmentAssignments || []).some((da: any) => {
                const b = (da.department?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const n = (da.department?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                return b.includes("mam non") || n.includes("mam non");
            });

        let entranceAssignmentsSummary = {
            hasGeneral: false,
            hasPreschool: false,
            isPreschoolTeacher,
            generalStudentCount: 0,
            preschoolStudentCount: 0,
            totalStudentCount: 0,
            batches: [] as any[]
        };

        try {
            const [k12AssignsRaw, preschoolAssignsRaw] = await Promise.all([
                prisma.inputAssessmentTeacherAssignment.findMany({
                    where: {
                        userId: session.user.id,
                        ...(targetYearId ? { period: { academicYearId: targetYearId } } : {})
                    },
                    include: {
                        subject: true,
                        batch: true,
                        period: true
                    },
                    orderBy: { createdAt: "desc" }
                }).catch(() => []),
                (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
                    where: {
                        OR: [
                            { userId: session.user.id },
                            { delegatedUserId: session.user.id }
                        ]
                    },
                    include: {
                        batch: true,
                        period: true
                    },
                    orderBy: { createdAt: "desc" }
                }).catch(() => [])
            ]);

            const k12Assigns = (k12AssignsRaw || []).filter((a: any) =>
                a?.batch?.status !== "COMPLETED" &&
                a?.period?.status !== "COMPLETED" &&
                a?.period?.status !== "LOCKED"
            );
            const preschoolAssigns = (preschoolAssignsRaw || []).filter((a: any) => {
                if (a?.batch?.status === "COMPLETED") return false;
                if (a?.period?.status === "COMPLETED" || a?.period?.status === "LOCKED") return false;
                if (targetYearId && a?.period?.academicYearId && a.period.academicYearId !== targetYearId) return false;
                return true;
            });

            const k12PeriodIds = Array.from(new Set(k12Assigns.map((a: any) => a.periodId).filter(Boolean))) as string[];
            const preschoolPeriodIds = Array.from(new Set(preschoolAssigns.map((a: any) => a.periodId).filter(Boolean))) as string[];

            const [k12Students, preschoolStudents] = await Promise.all([
                k12PeriodIds.length > 0
                    ? prisma.inputAssessmentStudent.findMany({
                        where: { periodId: { in: k12PeriodIds } },
                        select: { id: true, periodId: true, batchId: true, grade: true, surveyFormType: true }
                    }).catch(() => [])
                    : Promise.resolve([]),
                preschoolPeriodIds.length > 0
                    ? (prisma as any).preschoolInputAssessmentStudent.findMany({
                        where: { periodId: { in: preschoolPeriodIds } },
                        select: { id: true, periodId: true, batchId: true, grade: true, probationaryTeacher: true, admissionResult: true }
                    }).catch(() => [])
                    : Promise.resolve([])
            ]);

            const batchMap = new Map<string, {
                key: string;
                periodId: string;
                periodName: string;
                batchId: string | null;
                batchName: string;
                isPreschool: boolean;
                latestTime: number;
                studentIds: Set<string>;
                subjects: Set<string>;
                grades: Set<string>;
            }>();

            const uniqueK12Ids = new Set<string>();
            for (const a of k12Assigns) {
                const key = `k12__${a.periodId}__${a.batchId || "all"}`;
                const assignTime = Math.max(
                    a.createdAt ? new Date(a.createdAt).getTime() : 0,
                    a.batch?.startDate ? new Date(a.batch.startDate).getTime() : 0
                );
                if (!batchMap.has(key)) {
                    batchMap.set(key, {
                        key,
                        periodId: a.periodId,
                        periodName: a.period?.name || "Kỳ khảo sát",
                        batchId: a.batchId || null,
                        batchName: a.batch?.name || "Tất cả các đợt",
                        isPreschool: false,
                        latestTime: assignTime,
                        studentIds: new Set<string>(),
                        subjects: new Set<string>(),
                        grades: new Set<string>()
                    });
                } else {
                    const ex = batchMap.get(key)!;
                    if (assignTime > ex.latestTime) ex.latestTime = assignTime;
                }
                const entry = batchMap.get(key)!;
                if (a.subject?.name) entry.subjects.add(a.subject.name);
                if (a.grade) entry.grades.add(String(a.grade).replace(/^Khối\s+/i, "").trim());

                const aGrade = (a.grade || "").toLowerCase().replace("khối", "").trim();
                const aSys = (a.educationSystem || "").toLowerCase().trim();
                const matched = k12Students.filter((st: any) => {
                    if (st.periodId !== a.periodId) return false;
                    if (a.batchId && st.batchId !== a.batchId) return false;
                    const stGrade = (st.grade || "").toLowerCase().replace("khối", "").trim();
                    const stSys = (st.surveyFormType || "").toLowerCase().trim();
                    const gMatch = !aGrade || aGrade === "tất cả" || stGrade === aGrade;
                    const sMatch = !aSys || aSys === "tất cả" || !stSys || stSys.includes(aSys) || aSys.includes(stSys);
                    return gMatch && sMatch;
                });

                const finalMatched = (matched.length === 0 && a.batchId)
                    ? k12Students.filter((st: any) => st.periodId === a.periodId && st.batchId === a.batchId)
                    : matched;

                finalMatched.forEach((st: any) => {
                    entry.studentIds.add(st.id);
                    uniqueK12Ids.add(st.id);
                });
            }

            const uniquePreschoolIds = new Set<string>();
            for (const a of preschoolAssigns) {
                const key = `mn__${a.periodId}__${a.batchId || "all"}`;
                const assignTime = Math.max(
                    a.createdAt ? new Date(a.createdAt).getTime() : 0,
                    a.batch?.startDate ? new Date(a.batch.startDate).getTime() : 0
                );
                if (!batchMap.has(key)) {
                    batchMap.set(key, {
                        key,
                        periodId: a.periodId,
                        periodName: a.period?.name || "Kỳ khảo sát Mầm non",
                        batchId: a.batchId || null,
                        batchName: a.batch?.name || "Tất cả các đợt",
                        isPreschool: true,
                        latestTime: assignTime,
                        studentIds: new Set<string>(),
                        subjects: new Set<string>(["Phỏng vấn định hướng Mầm non"]),
                        grades: new Set<string>()
                    });
                } else {
                    const ex = batchMap.get(key)!;
                    if (assignTime > ex.latestTime) ex.latestTime = assignTime;
                }
                const entry = batchMap.get(key)!;
                if (a.grade) entry.grades.add(a.grade);

                const isProbation = a.grade === "Mẫu phiếu học thử" || a.grade === "Học thử";
                const matched = preschoolStudents.filter((st: any) => {
                    if (st.periodId !== a.periodId) return false;
                    if (a.batchId && st.batchId !== a.batchId) return false;
                    if (isProbation) {
                        return st.admissionResult === "Học thử" || st.probationaryTeacher === teacher.teacherName;
                    }
                    return matchesPreschoolGrade(st.grade || "", a.grade);
                });
                matched.forEach((st: any) => {
                    entry.studentIds.add(st.id);
                    uniquePreschoolIds.add(st.id);
                });
            }

            const allMappedBatches = Array.from(batchMap.values())
                .sort((a, b) => (b.latestTime || 0) - (a.latestTime || 0))
                .map(b => ({
                    key: b.key,
                    periodId: b.periodId,
                    periodName: b.periodName,
                    batchId: b.batchId,
                    batchName: b.batchName,
                    isPreschool: b.isPreschool,
                    studentCount: b.studentIds.size,
                    subjects: Array.from(b.subjects),
                    grades: Array.from(b.grades)
                }));

            const nonEmptyBatches = allMappedBatches.filter(b => b.studentCount > 0);
            const batchesArray = nonEmptyBatches.length > 0 ? nonEmptyBatches : allMappedBatches;

            entranceAssignmentsSummary = {
                hasGeneral: k12Assigns.length > 0,
                hasPreschool: preschoolAssigns.length > 0,
                isPreschoolTeacher,
                generalStudentCount: uniqueK12Ids.size,
                preschoolStudentCount: uniquePreschoolIds.size,
                totalStudentCount: uniqueK12Ids.size + uniquePreschoolIds.size,
                batches: batchesArray
            };
        } catch (entErr) {
            console.error("Error computing entranceAssignmentsSummary in getDashboardMetrics:", entErr);
        }

        return NextResponse.json({
            totalClasses: homeroomClassesCount,
            totalStudents: homeroomStudentsCount,
            totalAssignments,
            scoredStudents: 0,
            academicYearName,
            totalObservedLessons,
            remedialStudentsCount,
            isManagerRole,
            managedDepartmentName,
            managedDepartmentId,
            managedTeachersCount,
            managedDeptObservedCount,
            entranceAssignments: entranceAssignmentsSummary,
            campus: teacher.campus ? {
                id: teacher.campus.id,
                campusCode: teacher.campus.campusCode,
                campusName: teacher.campus.campusName
            } : null,
            teacherInfo: {
                id: teacher.id,
                teacherCode: teacher.teacherCode,
                teacherName: teacher.teacherName,
                homeroomClass: teacher.homeroomClass,
                position: teacher.position,
                positions: teacher.positions,
                mainSubject: teacher.mainSubjectRel?.subjectName || null
            }
        });
    }
    
    if (action === "getStudents") {
        const periodId = searchParams.get("periodId");
        const grade = searchParams.get("grade");
        const systemCode = searchParams.get("systemCode");
        const subjectId = searchParams.get("subjectId");
        const batchId = searchParams.get("batchId");

        // Guard: periodId is required
        if (!periodId) {
            return NextResponse.json([], { status: 200 });
        }

        if (subjectId === "preschool-probation") {
            try {
                const userRole = ((session?.user as any)?.role || "").toUpperCase();
                const isAdminViewer = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);
                const currentTeacher = await prisma.teacher.findUnique({
                    where: { userId: session.user.id }
                });
                const candidateNames = Array.from(
                    new Set([currentTeacher?.teacherName, (session.user as any)?.fullName, (session.user as any)?.name].filter(Boolean))
                ) as string[];
                if (!isAdminViewer && candidateNames.length === 0) {
                    return NextResponse.json([]);
                }

                // Check if teacher has an assignment for "Mẫu phiếu học thử" / "Học trải nghiệm"
                const hasProbationAssignment = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findFirst({
                    where: {
                        periodId: periodId,
                        userId: session.user.id,
                        grade: { in: ["Mẫu phiếu học thử", "Học thử", "Học trải nghiệm"] },
                        ...(batchId && batchId !== "all" && batchId !== "null" ? { batchId } : {})
                    }
                });

                const whereClause: any = {
                    periodId: periodId,
                    ...(batchId && batchId !== "all" && batchId !== "null" ? {
                        AND: [{ OR: [{ batchId: batchId }, { batchId: null }] }]
                    } : {})
                };

                if (isAdminViewer || hasProbationAssignment) {
                    whereClause.OR = [
                        { admissionResult: { in: ["Học thử", "Học trải nghiệm"] } },
                        { bghApprovalStatus: { in: ["HEN_TRAI_NGHIEM", "DAT_HOC_THU"] } },
                        { probationaryTeacher: { not: null } },
                    ];
                } else {
                    whereClause.probationaryTeacher = { in: candidateNames };
                }

                const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        grade: true,
                        gender: true,
                        dateOfBirth: true,
                        admissionCampus: true,
                        batchId: true,
                        probationaryScoreText: true,
                        probationaryResult: true,
                        probationaryComment: true,
                        probationaryPeriod: true,
                        probationaryClass: true,
                        probationaryTeacher: true,
                        probationaryBghStatus: true,
                        probationaryBghComment: true,
                        probationaryBghUser: true,
                        probationaryBghDate: true,
                        probationaryBghLog: true,
                        probationaryTeacherLog: true,
                        surveyFormType: true,
                        admissionResult: true,
                        batch: {
                            select: {
                                startDate: true,
                                endDate: true
                            }
                        }
                    }
                });

                const criteriaCounts = await (prisma as any).preschoolDevCriteria.groupBy({
                    by: ["ageGroup"],
                    where: {
                        status: "ACTIVE",
                        area: { type: "PROBATION" }
                    },
                    _count: { id: true }
                });
                const criteriaMap: Record<string, number> = {};
                for (const cc of criteriaCounts) {
                    criteriaMap[cc.ageGroup] = cc._count.id;
                }

                const enriched = students.map((s: any) => {
                    let scoredCount = 0;
                    try {
                        if (s.probationaryScoreText) {
                            const scoreMap = JSON.parse(s.probationaryScoreText);
                            scoredCount = Object.keys(scoreMap).length;
                        }
                    } catch (e) {
                        console.error("Error parsing probationaryScoreText", e);
                    }

                    const resolvedAgeGroup = getProbationAgeGroup(s.grade);
                    const totalCriteria = criteriaMap[resolvedAgeGroup] || 0;

                    return {
                        ...s,
                        scoredCount,
                        totalCriteria,
                        isPreschool: true,
                        isPreschoolProbation: true,
                        resolvedAgeGroup,
                        scoreVals: []
                    };
                });

                return NextResponse.json(enriched);
            } catch (err: any) {
                console.error("Error fetching probationary students:", err);
                return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
            }
        }

        if (subjectId === "preschool-health") {
            try {
                const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                    where: {
                        periodId,
                        ...(batchId && batchId !== "all" && batchId !== "null" ? { batchId } : {}),
                    },
                    orderBy: { fullName: "asc" },
                });

                const stIds = (students || []).map((s: any) => s.id);
                const roundMap = new Map<string, any>();
                if (stIds.length > 0) {
                    try {
                        const placeholders = stIds.map(() => "?").join(",");
                        const rounds = await prisma.$queryRawUnsafe<any[]>(
                            `SELECT "studentId", "heightCm", "weightKg", "physicalStatus", "physicalCheckedAt"
                             FROM "PreschoolAssessmentRound"
                             WHERE "studentId" IN (${placeholders})
                             ORDER BY "roundNumber" ASC`,
                            ...stIds
                        );
                        for (const r of rounds || []) {
                            roundMap.set(r.studentId, r);
                        }
                    } catch {}
                }

                const enriched = (students || []).map((s: any) => {
                    const r = roundMap.get(s.id);
                    const hasHealth = Boolean((r?.heightCm && r?.weightKg) || r?.physicalCheckedAt);
                    return {
                        ...s,
                        scoredCount: hasHealth ? 1 : 0,
                        totalCriteria: 1,
                        isPreschool: true,
                        isPreschoolHealth: true,
                        resolvedAgeGroup: "B4A · Y tế thể chất",
                        healthHeightCm: r?.heightCm ?? null,
                        healthWeightKg: r?.weightKg ?? null,
                        healthStatus: r?.physicalStatus ?? null,
                        scoreVals: [],
                    };
                });

                return NextResponse.json(enriched);
            } catch (err: any) {
                console.error("Error fetching preschool health (B4A) students:", err);
                return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
            }
        }

        if (subjectId === "preschool-psychology") {
            try {
                const userRole = ((session?.user as any)?.role || "").toUpperCase();
                const isAdminViewer = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);
                const currentTeacher = await prisma.teacher.findUnique({
                    where: { userId: session.user.id }
                });
                const candidateNames = Array.from(
                    new Set([currentTeacher?.teacherName, (session.user as any)?.fullName, (session.user as any)?.name].filter(Boolean))
                ) as string[];
                const currentEmail = String((session.user as any)?.email || "").trim().toLowerCase();

                const rawRows = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT s."id", s."studentCode", s."fullName", s."grade", s."gender", s."dateOfBirth",
                            s."admissionCampus", s."batchId", s."periodId", s."surveyFormType",
                            s."probationaryClass", s."probationaryTeacher", s."probationaryPeriod",
                            s."devPsychologyComment",
                            s."trialPsychologyScreening", s."trialPsychologistId", s."trialPsychologistName",
                            s."trialPsychologistEmail", s."trialPsychologyStatus", s."trialPsychologyConclusion",
                            s."trialPsychologyFeedback"
                     FROM "PreschoolInputAssessmentStudent" s
                     WHERE s."periodId" = ?
                       AND (s."trialPsychologyScreening" = 1 OR s."trialPsychologistId" IS NOT NULL OR s."trialPsychologistName" IS NOT NULL)`,
                    periodId
                );

                const filtered = (rawRows || []).filter((r: any) => {
                    if (batchId && batchId !== "all" && batchId !== "null" && r.batchId && r.batchId !== batchId) {
                        return false;
                    }
                    if (isAdminViewer) return true;
                    const emailMatch = currentEmail && String(r.trialPsychologistEmail || "").trim().toLowerCase() === currentEmail;
                    const idMatch = r.trialPsychologistId && r.trialPsychologistId === session.user.id;
                    const nameMatch = r.trialPsychologistName && candidateNames.includes(String(r.trialPsychologistName).trim());
                    return Boolean(idMatch || emailMatch || nameMatch);
                });

                const enriched = filtered.map((s: any) => {
                    const psyDone = s.trialPsychologyStatus === "COMPLETED" || s.trialPsychologyStatus === "EVALUATED";
                    return {
                        ...s,
                        scoredCount: psyDone ? 1 : 0,
                        totalCriteria: 1,
                        isPreschool: true,
                        isPreschoolPsychology: true,
                        resolvedAgeGroup: "BM.KTĐBCL.09",
                        scoreVals: [],
                    };
                });

                return NextResponse.json(enriched);
            } catch (err: any) {
                console.error("Error fetching preschool psychology students:", err);
                return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
            }
        }

        if (subjectId === "preschool") {
            const where: any = { periodId };
            
            if (grade && grade !== "Tất cả" && grade !== "all") {
                where.grade = grade;
            }
            
            if (batchId && batchId !== "all" && batchId !== "null") {
                where.OR = [
                    { batchId: batchId },
                    { batchId: null }
                ];
            }

                        const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                where,
                select: { 
                    id: true, 
                    studentCode: true, 
                    fullName: true, 
                    grade: true, 
                    gender: true, 
                    dateOfBirth: true, 
                    admissionCampus: true, 
                    batchId: true, 
                    devProfessionalComment: true, 
                    devPsychologyComment: true, 
                    devImportantNote: true, 
                    devAssessmentResult: true, 
                    admissionResult: true,
                    bghApprovalStatus: true,
                    bghApprovalComment: true,
                    gdcsApprovalStatus: true,
                    gdcsApprovalComment: true,
                    surveyFormType: true,
                    batch: {
                        select: {
                            startDate: true,
                            endDate: true
                        }
                    }
                }
            });

            // Filter preschool students by teacher's preschool assignments
            let preschoolAssignments = [];
            if (!grade) {
                preschoolAssignments = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
                    where: {
                        OR: [
                            { userId: session.user.id },
                            { delegatedUserId: session.user.id }
                        ],
                        periodId: periodId || undefined
                    }
                });
            }

                        const allStudentIds = students.map((s: any) => s.id);
            // Fetch all scores for all period students first to get timestamps
            const scores = await (prisma as any).preschoolDevScore.findMany({
                where: { studentId: { in: allStudentIds } },
                include: { criteria: { include: { area: true } } }
            });

            // Group scores by studentId
            const studentScoresMap: Record<string, any[]> = {};
            for (const sc of scores) {
                if (!studentScoresMap[sc.studentId]) {
                    studentScoresMap[sc.studentId] = [];
                }
                studentScoresMap[sc.studentId].push(sc);
            }

            let filteredStudents = students;
            if (preschoolAssignments.length > 0) {
                filteredStudents = students.filter(st => {
                    const studentScoresList = studentScoresMap[st.id] || [];
                    const firstScore = studentScoresList[0];
                    const surveyDate = firstScore ? firstScore.createdAt : new Date();
                    const mappedGrade = getSurveyFormAgeGroup(st.grade, surveyDate);
                    return preschoolAssignments.some(ta => {
                        const taGrade = ta.grade;
                        if (!taGrade || taGrade.toLowerCase().trim() === "tất cả") return true;
                        
                        // Check match on original grade
                        if (matchesPreschoolGrade(st.grade || "", taGrade)) return true;
                        // Check match on mapped grade
                        if (matchesPreschoolGrade(mappedGrade, taGrade)) return true;
                        
                        return false;
                    });
                });
            } else if (!grade && preschoolAssignments.length === 0) {
                // If teacher has NO preschool assignments for this period, they shouldn't see anyone
                filteredStudents = [];
            }

            // Get total criteria count per ageGroup/grade
            const criteriaCounts = await (prisma as any).preschoolDevCriteria.groupBy({
                by: ["ageGroup"],
                where: { status: "ACTIVE" },
                _count: { id: true }
            });
            const criteriaMap: Record<string, number> = {};
            for (const cc of criteriaCounts) {
                criteriaMap[cc.ageGroup] = cc._count.id;
            }

            const enriched = filteredStudents.map((s: any) => {
                const studentScoresList = studentScoresMap[s.id] || [];
                const firstScore = studentScoresList[0];
                const surveyDate = firstScore ? firstScore.createdAt : new Date();
                const sAgeGroup = getSurveyFormAgeGroup(s.grade, surveyDate);
                const totalCriteria = criteriaMap[sAgeGroup] || 0;
                const scoredCount = studentScoresList.length;
                return {
                    ...s,
                    scoredCount,
                    totalCriteria,
                    isPreschool: true,
                    resolvedAgeGroup: sAgeGroup,
                    scoreVals: scoredCount > 0 ? Array(scoredCount).fill("3") : []
                };
            });

            return NextResponse.json(enriched);
        }        const validSystems = [systemCode].filter(Boolean) as string[];
        if (systemCode) {
            const eduSysList = await prisma.educationSystem.findMany({
                where: { code: systemCode }
            });
            eduSysList.forEach(sys => {
                if (sys.name) {
                    validSystems.push(sys.name);
                    validSystems.push(sys.name.toUpperCase());
                    validSystems.push(sys.name.toLowerCase());
                }
            });
        }
        
        const userRole = ((session?.user as any)?.role || "").toUpperCase();
        const isAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);

        // Luon load teacherAssignments de kiem tra quyen va loc dung khoi/he
        const teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: {
                ...(isAdmin ? {} : { userId: session.user.id }),
                periodId: periodId || undefined,
                subjectId: subjectId || undefined
            }
        });
        
        const sysList = await prisma.educationSystem.findMany();
        const eduSystemsMap: Record<string, Set<string>> = {};
        sysList.forEach(s => {
            const code = s.code.toLowerCase();
            if (!eduSystemsMap[code]) eduSystemsMap[code] = new Set();
            eduSystemsMap[code].add(s.name.toLowerCase());
        });

        const students = await prisma.inputAssessmentStudent.findMany({
            where: {
                periodId: periodId || undefined,
                ...(batchId ? { OR: [{ batchId: batchId }, { batchId: null }] } : {})
            },
            include: {
                batch: { select: { id: true, name: true, status: true } },
                orientationRecord: {
                    select: {
                        id: true,
                        status: true,
                        updatedAt: true,
                        interviewerName: true,
                        psychologyReferralStatus: true,
                        psychologyTeacherName: true,
                        psychologyData: true
                    }
                },
                scores: {
                    where: { subjectId: subjectId || undefined },
                    include: { subject: true }
                }
            }
        });

        // Filter in memory to bypass any strict case-sensitivity issues of SQLite
        const filteredStudents = students.filter(st => {
            if ((st as any).batch?.status === "COMPLETED") return false;
            // Check teacher assignments first
            if (teacherAssignments.length > 0) {
                // The student must match at least one of the teacher's assignments for this subject
                const stGrade = (st.grade || "").toLowerCase().trim();
                const stSys = (st.surveyFormType || "").toLowerCase().trim();
                
                const matchesAssignment = teacherAssignments.some(ta => {
                    if (ta.batchId && st.batchId && ta.batchId !== st.batchId) return false;
                    const taGrade = (ta.grade || "").toLowerCase().trim();
                    const taSys = (ta.educationSystem || "").toLowerCase().trim();
                    
                    // FIX: So sánh số khối chính xác, tránh lỗi "10".includes("1") = true
                    const taGradeNum = taGrade.replace("khối", "").trim();
                    const stGradeNum = stGrade.replace("khối", "").trim();
                    let gradeMatch = !taGrade || taGrade === "tất cả" || stGrade === taGrade ||
                        (stGradeNum !== "" && taGradeNum !== "" && stGradeNum === taGradeNum);

                    let sysMatch = false;
                    if (!taSys || taSys === "tất cả") {
                        sysMatch = true;
                    } else {
                        const taSysNames = eduSystemsMap[taSys] || new Set();
                        sysMatch = stSys === taSys || 
                                   stSys.includes(taSys) || 
                                   taSys.includes(stSys);
                        
                        if (!sysMatch) {
                            for (const taSysName of taSysNames) {
                                if (stSys === taSysName || stSys.includes(taSysName) || taSysName.includes(stSys)) {
                                    sysMatch = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Fallback cho phân công gắn trực tiếp vào 1 Đợt cụ thể (ta.batchId) nếu đợt đó không có học sinh nào khớp khối mặc định
                    if ((!gradeMatch || !sysMatch) && ta.batchId && st.batchId === ta.batchId) {
                        const batchHasStrictMatch = students.some(otherSt => {
                            if (otherSt.batchId !== ta.batchId) return false;
                            const oG = (otherSt.grade || "").toLowerCase().replace("khối", "").trim();
                            return oG === taGradeNum;
                        });
                        if (!batchHasStrictMatch) {
                            gradeMatch = true;
                            sysMatch = true;
                        }
                    }
                    
                    return gradeMatch && sysMatch;
                });
                
                if (!matchesAssignment && !isAdmin) return false;
            } else if (!grade && !systemCode && !isAdmin) {
                // Neu khong co assignment nao va khong phai Admin/QA, GV khong nen thay hoc sinh nao
                return false;
            }
            // Loc theo khoi cu the (neu GV chon tu bo loc Khoi tren UI)
            if (grade && grade.trim() !== "" && grade !== "Tất cả") {
                const stGrade = (st.grade || "").toLowerCase().trim();
                const qGrade = grade.toLowerCase().trim();
                const qGradeNum = qGrade.replace("khối", "").trim();
                
                const stGradeNum = stGrade.replace("khối", "").trim();
                if (stGrade) {
                    const matchGrade = stGrade === qGrade || stGradeNum === qGradeNum;
                    if (!matchGrade) {
                        // Nếu đang lọc theo 1 đợt cụ thể mà đợt đó không có học sinh nào thuộc qGrade (do lệch khối khi gán đợt), vẫn hiển thị HS của đợt đó
                        const anyStudentInBatchMatchesGrade = batchId && students.some(otherSt => {
                            const oG = (otherSt.grade || "").toLowerCase().replace("khối", "").trim();
                            return oG === qGradeNum;
                        });
                        if (!batchId || anyStudentInBatchMatchesGrade) return false;
                    }
                }
            }

            if (validSystems.length > 0) {
                // If student has no system assigned (due to Excel import error), show them as fallback
                if (!st.surveyFormType) return true;
                const stSys = st.surveyFormType.trim().toLowerCase();
                // match if either the code or the name matches case-insensitively
                const matchSys = validSystems.some(vs => vs.trim().toLowerCase() === stSys);
                
                // Allow partial matches just in case
                const partialMatchSys = validSystems.some(vs => stSys.includes(vs.trim().toLowerCase()) || vs.trim().toLowerCase().includes(stSys));
                
                if (!matchSys && !partialMatchSys) return false;
            }
            
            return true;
        });
        

        // Tự động bổ sung các Học sinh có cam kết bồi dưỡng môn học này thuộc lớp GV được phân công
        const currentTeacherForStud = await prisma.teacher.findUnique({
            where: { userId: session.user.id }
        });

        const eligibleStudentCodes = new Set();
        if (currentTeacherForStud) {
            const teachingAssignments = await prisma.teachingAssignment.findMany({
                where: {
                    teacherId: currentTeacherForStud.id,
                    ...(subjectId ? { subjectId } : {})
                },
                include: {
                    class: true,
                    subject: true
                }
            });

            const targetStudents = await prisma.learningSupportTarget.findMany({
                where: {
                    supportType: "ACADEMIC",
                    terminationStatus: { not: "TERMINATED" },
                    student: {
                        classId: { in: teachingAssignments.map(ta => ta.classId) }
                    }
                },
                include: {
                    student: true
                }
            });

            const commitmentStudents = await prisma.studentLearningCommitment.findMany({
                where: {
                    status: "ACTIVE",
                    student: {
                        classId: { in: teachingAssignments.map(ta => ta.classId) }
                    }
                },
                include: {
                    student: true
                }
            });

            for (const ts of targetStudents) {
                const studentClassId = ts.student?.classId;
                const targetReason = (ts.reason || "").toLowerCase();
                
                const hasMatchingAssignment = teachingAssignments.some(ta => {
                    if (ta.classId !== studentClassId) return false;
                    const subName = (ta.subject?.subjectName || ta.subject?.name || "").toLowerCase();
                    return targetReason.includes(subName) || subName.includes(targetReason);
                });

                if (hasMatchingAssignment && ts.student?.studentCode) {
                    eligibleStudentCodes.add(ts.student.studentCode);
                }
            }
            
            for (const cs of commitmentStudents) {
                const studentClassId = cs.student?.classId;
                const content = (cs.content || "").toLowerCase();
                
                const hasMatchingAssignment = teachingAssignments.some(ta => {
                    if (ta.classId !== studentClassId) return false;
                    const subName = (ta.subject?.subjectName || ta.subject?.name || "").toLowerCase();
                    return content.includes(subName) || subName.includes(content);
                });

                if (hasMatchingAssignment && cs.student?.studentCode) {
                    eligibleStudentCodes.add(cs.student.studentCode);
                }
            }
        }

        let finalFilteredStudents = [...filteredStudents];
        
        if (eligibleStudentCodes.size > 0) {
            const allPeriodStudents = await prisma.inputAssessmentStudent.findMany({
                where: {
                    periodId: periodId || undefined,
                    ...(batchId ? { OR: [{ batchId: batchId }, { batchId: null }] } : {}),
                    studentCode: { in: Array.from(eligibleStudentCodes) as string[] }
                },
                include: {
                    batch: { select: { id: true, name: true, status: true } },
                    orientationRecord: {
                        select: {
                            id: true,
                            status: true,
                            updatedAt: true,
                            interviewerName: true
                        }
                    },
                scores: {
                        where: { subjectId: subjectId || undefined },
                        include: { subject: true }
                    }
                }
            });

            const combinedMap = new Map();
            filteredStudents.forEach(s => combinedMap.set(s.id, s));
            allPeriodStudents.forEach(s => {
                if (s.studentCode && eligibleStudentCodes.has(s.studentCode) && (s as any).batch?.status !== "COMPLETED") {
                    combinedMap.set(s.id, {
                        ...s,
                        isPreschool: false,
                        scoreVals: []
                    });
                }
            });
            finalFilteredStudents = Array.from(combinedMap.values());
        }

        // Bổ sung thông tin bản ghi TCI & PVDH (phiếu phỏng vấn định hướng K1-K12)
        try {
            await Promise.all([
                ensureTciSchema().catch(() => {}),
                ensurePvdhSchema().catch(() => {}),
            ]);
            const studentIds = finalFilteredStudents.map((s: any) => s.id).filter(Boolean);
            if (studentIds.length > 0) {
                const tciDb = getTciDb();
                const pvdhDb = getPvdhDb();
                const [tciRecords, pvdhRecords] = await Promise.all([
                    tciDb.tciAssessmentRecord.findMany({
                        where: {
                            studentId: { in: studentIds },
                            isLatestVersion: true,
                        },
                    }).catch(() => []),
                    pvdhDb.pvdhAssessmentRecord.findMany({
                        where: {
                            studentId: { in: studentIds },
                            isLatestAttempt: true,
                        },
                        select: {
                            id: true,
                            studentId: true,
                            templateCode: true,
                            templateVersionCode: true,
                            versionNumber: true,
                            workflowStatus: true,
                            studentSectionStatus: true,
                            parentSectionStatus: true,
                            orientationSectionStatus: true,
                            teacherSummaryJson: true,
                            isLocked: true,
                            studentInterviewerName: true,
                            parentInterviewerName: true,
                            returnReason: true,
                            updatedAt: true,
                        },
                    }).catch(() => []),
                ]);
                const tciMap = new Map<string, any>();
                for (const r of tciRecords) {
                    tciMap.set(r.studentId, r);
                }
                const pvdhMap = new Map<string, any>();
                for (const r of pvdhRecords) {
                    pvdhMap.set(r.studentId, r);
                }
                finalFilteredStudents = finalFilteredStudents.map((s: any) => ({
                    ...s,
                    tciRecord: tciMap.get(s.id) || null,
                    pvdhRecord: pvdhMap.get(s.id) || null,
                }));
            }
        } catch (tciErr) {
            console.warn("Could not enrich TCI/PVDH records in getStudents:", tciErr);
        }

        return NextResponse.json(finalFilteredStudents);
    }

    
    if (action === "getReport") {
        const periodId = searchParams.get("periodId");
        if (!periodId) return NextResponse.json({error: "Missing periodId"}, {status:400});
        
        let whereClause: any = {};
        if (periodId === "all") {
            const academicYearId = searchParams.get("academicYearId");
            if (!academicYearId) return NextResponse.json({error: "Missing academicYearId for all periods selection"}, {status:400});
            const periods = await prisma.inputAssessmentPeriod.findMany({
                where: { academicYearId }
            });
            const periodIds = periods.map(p => p.id);
            whereClause.periodId = { in: periodIds };
        } else {
            whereClause.periodId = periodId;
        }

        const students = await prisma.inputAssessmentStudent.findMany({
            where: whereClause,
            orderBy: [{ grade: 'asc' }, { fullName: 'asc' }],
            include: {
                batch: true,
                batch: { select: { id: true, name: true, status: true } },
                scores: {
                    include: { subject: true }
                }
            }
        });

        try {
            await Promise.all([
                ensureTciSchema().catch(() => {}),
                ensurePvdhSchema().catch(() => {}),
            ]);
            const studentIds = students.map((s: any) => s.id).filter(Boolean);
            if (studentIds.length > 0) {
                const tciDb = getTciDb();
                const pvdhDb = getPvdhDb();
                const [tciRecords, pvdhRecords, gdcsLogs] = await Promise.all([
                    tciDb.tciAssessmentRecord.findMany({
                        where: {
                            studentId: { in: studentIds },
                            isLatestVersion: true,
                        },
                    }).catch(() => []),
                    pvdhDb.pvdhAssessmentRecord.findMany({
                        where: {
                            studentId: { in: studentIds },
                            isLatestAttempt: true,
                        },
                        select: {
                            id: true,
                            studentId: true,
                            templateCode: true,
                            templateVersionCode: true,
                            versionNumber: true,
                            workflowStatus: true,
                            studentSectionStatus: true,
                            parentSectionStatus: true,
                            orientationSectionStatus: true,
                            teacherSummaryJson: true,
                            isLocked: true,
                            studentInterviewerName: true,
                            updatedAt: true,
                        },
                    }).catch(() => []),
                    (prisma as any).auditLog.findMany({
                        where: {
                            action: "GDCS_APPROVAL_EMAIL_SENT",
                            targetTable: "InputAssessmentStudent",
                            targetId: { in: studentIds },
                        },
                        orderBy: { createdAt: "desc" },
                        select: { targetId: true, createdAt: true, newValues: true },
                    }).catch(() => []),
                ]);
                const tciMap = new Map<string, any>();
                for (const r of tciRecords) {
                    tciMap.set(r.studentId, r);
                }
                const pvdhMap = new Map<string, any>();
                for (const r of pvdhRecords) {
                    pvdhMap.set(r.studentId, r);
                }
                const gdcsMailMap = new Map<string, { sentAt: string; recipient: string }>();
                for (const log of gdcsLogs || []) {
                    if (!log?.targetId || gdcsMailMap.has(log.targetId)) continue;
                    let recipient = "";
                    try {
                        const parsed = log.newValues ? JSON.parse(log.newValues) : null;
                        recipient = parsed?.to || "";
                    } catch {}
                    gdcsMailMap.set(log.targetId, {
                        sentAt: log.createdAt ? new Date(log.createdAt).toISOString() : "",
                        recipient,
                    });
                }
                return NextResponse.json(
                    students.map((s: any) => {
                        const gm = gdcsMailMap.get(s.id);
                        return {
                            ...s,
                            tciRecord: tciMap.get(s.id) || null,
                            pvdhRecord: pvdhMap.get(s.id) || null,
                            gdcsEmailSentAt: gm?.sentAt || null,
                            gdcsEmailRecipient: gm?.recipient || null,
                        };
                    })
                );
            }
        } catch (tciErr) {
            console.warn("Could not enrich TCI/PVDH records in getReport:", tciErr);
        }
        
        return NextResponse.json(students);
    }

    if (action === "getRetestHistory") {
        const studentCode = searchParams.get("studentCode");
        if (!studentCode) return NextResponse.json({error: "Missing studentCode"}, {status:400});
        
        const history = await prisma.inputAssessmentStudent.findMany({
            where: { studentCode: studentCode },
            orderBy: { createdAt: 'desc' },
            include: {
                period: true,
                batch: true,
                batch: { select: { id: true, name: true, status: true } },
                scores: {
                    include: { subject: true }
                }
            }
        });
        
        return NextResponse.json(history);
    }

    if (action === "getPreschoolRetestHistory") {
        const studentCode = searchParams.get("studentCode");
        if (!studentCode) return NextResponse.json({error: "Missing studentCode"}, {status:400});
        
        const history = await (prisma as any).preschoolInputAssessmentStudent.findMany({
            where: { studentCode: studentCode },
            orderBy: { createdAt: 'desc' },
            include: {
                period: true,
                batch: true
            }
        });
        
        const historyWithScores = await Promise.all(history.map(async (st: any) => {
            const scores = await (prisma as any).preschoolDevScore.findMany({
                where: { studentId: st.id },
                include: { criteria: { include: { area: true } } }
            });
            return {
                ...st,
                scores
            };
        }));
        
        return NextResponse.json(historyWithScores);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Teacher Assessments API error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi hệ thống khi lưu/truy xuất dữ liệu." }, { status: 500 });
  }
}

export async function POST(req: any) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  try {
    const body = await req.json();
    const { action, studentId, subjectId, scores, comments, teacherName, teacherId, adminDossierEdit } = body;

    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isStrictAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN"].includes(userRole) || Boolean((session?.user as any)?.isSuperAdmin);
    const isAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "BGH_MN", "GIAO_VU", "GIAO_VU_CS"].includes(userRole);

    if (action === "deleteScore") {
      if (!isStrictAdmin) {
        return NextResponse.json({ error: "Chế độ xóa điểm đã khóa (chỉ tài khoản Admin mới có quyền)." }, { status: 403 });
      }
      if (!studentId || !subjectId) {
        return NextResponse.json({ error: "Missing studentId or subjectId" }, { status: 400 });
      }
      await prisma.studentAssessmentScore.deleteMany({
        where: { studentId, subjectId }
      });
      return NextResponse.json({ success: true });
    }

    if (adminDossierEdit && !isStrictAdmin) {
      return NextResponse.json({ error: "Chế độ chỉnh sửa điểm đã khóa (chỉ tài khoản Admin mới có quyền)." }, { status: 403 });
    }

    // -- SECURITY HARDENING: Check if Period or Batch is Locked --
    const student = await prisma.inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
    });
    if (!student) return NextResponse.json({error: "Student not found"}, {status: 404});

    const isPrtLocked = student.period?.status !== "ACTIVE";
    const isBtcLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED" || student.batch?.status === "COMPLETED";
    
    // Admins and management roles can always enter and edit scores even if period/batch is locked
    if ((isPrtLocked || isBtcLocked) && !isAdmin) {
        // Check override for this specific teacher/subject
        const activeUnlock = await prisma.inputAssessmentTeacherAssignment.findFirst({
            where: {
                userId: session.user.id,
                periodId: student.periodId,
                subjectId: subjectId,
                unlockRequestStatus: "APPROVED"
            }
        });
        if (!activeUnlock) {
            return NextResponse.json({error: "Hạng mục khảo sát (Kỳ/Đợt) đã bị Khóa. Không thể sửa điểm!"}, {status: 403});
        }
    }
    // ------------------------------------------------------------

    const existingScore = await prisma.studentAssessmentScore.findUnique({
        where: {
            studentId_subjectId: { studentId, subjectId }
        }
    });

    const finalTeacherName = (teacherName !== undefined && teacherName !== "")
      ? teacherName
      : (existingScore?.teacherName || session.user?.fullName || session.user?.name || "Admin");

    const finalTeacherId = teacherId !== undefined
      ? teacherId
      : (existingScore?.teacherId || session.user?.id || null);

    const record = await prisma.studentAssessmentScore.upsert({
        where: {
            studentId_subjectId: { studentId, subjectId }
        },
        create: {
            studentId,
            subjectId,
            scores: JSON.stringify(scores || []),
            comments: JSON.stringify(comments || []),
            teacherId: finalTeacherId,
            teacherName: finalTeacherName
        },
        update: {
            scores: JSON.stringify(scores || []),
            comments: JSON.stringify(comments || []),
            teacherId: finalTeacherId,
            teacherName: finalTeacherName
        },
        include: {
            subject: true
        }
    });

    // Đồng bộ điểm sang InputAssessmentStudent (mathScore, literatureScore, writtenEnglishScore, oralEnglishScore) để liên thông với Phiếu Định Hướng & Báo cáo A4
    try {
        const scoresArr = Array.isArray(scores) ? scores : [];
        const firstNumericStr = scoresArr.find((v: any) => v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(parseFloat(String(v).replace(",", "."))));
        if (firstNumericStr !== undefined) {
            const numVal = parseFloat(String(firstNumericStr).replace(",", "."));
            if (Number.isFinite(numVal)) {
                const subNameNorm = String(record.subject?.name || "").toLowerCase().normalize("NFC");
                const subCodeNorm = String(record.subject?.code || "").toLowerCase();
                const studentScoreUpdate: any = {};

                if (subNameNorm.includes("toán") || subCodeNorm.includes("toa")) {
                    studentScoreUpdate.mathScore = numVal;
                } else if (subNameNorm.includes("ngữ văn") || subNameNorm.includes("tiếng việt") || subCodeNorm.includes("nva") || subCodeNorm.includes("tvi")) {
                    studentScoreUpdate.literatureScore = numVal;
                } else if (subNameNorm.includes("tiếng anh") || subCodeNorm.includes("eng") || subCodeNorm.includes("esl")) {
                    if (subNameNorm.includes("vấn đáp")) {
                        studentScoreUpdate.oralEnglishScore = numVal;
                    } else {
                        studentScoreUpdate.writtenEnglishScore = numVal;
                    }
                } else if (subNameNorm.includes("tâm lý") || subCodeNorm.includes("tly")) {
                    const psychTotal = scoresArr.length >= 27
                        ? scoresArr.slice(7, 27).reduce((acc: number, v: any) => {
                            const n = Number(v);
                            return acc + (Number.isFinite(n) && n >= 0 ? n : 0);
                        }, 0)
                        : (scoresArr.length >= 7 && Number.isFinite(Number(scoresArr[6]))
                            ? Number(scoresArr[6])
                            : numVal);
                    studentScoreUpdate.psychologyScore = psychTotal;
                }

                if (Object.keys(studentScoreUpdate).length > 0) {
                    await prisma.inputAssessmentStudent.update({
                        where: { id: studentId },
                        data: studentScoreUpdate
                    });
                }
            }
        }
    } catch (syncErr) {
        console.error("Sync score to InputAssessmentStudent error:", syncErr);
    }

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}


export async function PUT(req: any) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  try {
    const body = await req.json();
    const {
      action,
      assignmentId,
      reason,
      periodId,
      batchId,
      subjectId,
      grade,
      educationSystem,
      userId,
      isPreschool
    } = body;

    if (action === "requestUnlock") {
        if (!reason || !String(reason).trim()) {
            return NextResponse.json({ error: "Vui lòng nhập lý do xin mở khóa." }, { status: 400 });
        }

        if (isPreschool) {
            return NextResponse.json(
                { error: "Phân công khảo sát Mầm non hiện cần Quản trị viên mở khóa trực tiếp trên đợt khảo sát." },
                { status: 400 }
            );
        }

        // 1. Kiểm tra bản ghi thật theo assignmentId
        const existingById = assignmentId
            ? await prisma.inputAssessmentTeacherAssignment.findUnique({
                  where: { id: assignmentId }
              })
            : null;

        if (existingById) {
            const record = await prisma.inputAssessmentTeacherAssignment.update({
                where: { id: existingById.id },
                data: {
                    unlockRequestStatus: "PENDING",
                    unlockReason: String(reason).trim()
                }
            });
            return NextResponse.json(record);
        }

        // 2. Trường hợp phân công tổng hợp (session_ex_... từ Lịch ca thi hoặc synthesized_... từ phân công giảng dạy)
        // Tìm hoặc tạo bản ghi InputAssessmentTeacherAssignment tương ứng để lưu trạng thái PENDING cho Admin duyệt
        let resolvedPeriodId = periodId || null;
        let resolvedBatchId = batchId || null;
        let resolvedSubjectId = subjectId || null;
        let resolvedGrade = grade || "Tất cả";
        let resolvedSystem = educationSystem || "Tất cả";
        let resolvedUserId = userId || session.user.id;

        if (typeof assignmentId === "string" && assignmentId.startsWith("session_ex_")) {
            const exId = assignmentId.replace("session_ex_", "");
            const ex = await (prisma as any).inputAssessmentSessionExaminer.findUnique({
                where: { id: exId },
                include: {
                    session: {
                        include: {
                            studentSessions: { include: { student: true }, take: 1 }
                        }
                    }
                }
            });
            if (ex?.session) {
                resolvedPeriodId = resolvedPeriodId || ex.session.periodId;
                resolvedBatchId = resolvedBatchId ?? ex.session.batchId ?? null;
                resolvedUserId = ex.userId || resolvedUserId;
                const firstSt = ex.session.studentSessions?.[0]?.student;
                if (!grade && firstSt?.grade) resolvedGrade = firstSt.grade;
                if (!educationSystem && firstSt?.surveyFormType) resolvedSystem = firstSt.surveyFormType;

                if (!resolvedSubjectId && ex.subjectCode) {
                    const allSubs = await prisma.assessmentSubject.findMany();
                    const subNorm = String(ex.subjectCode).toLowerCase().trim();
                    const matchedSub = allSubs.find(s =>
                        s.id === ex.subjectCode ||
                        String(s.code || "").toLowerCase().trim() === subNorm ||
                        String(s.name || "").toLowerCase().trim() === subNorm
                    );
                    if (matchedSub) resolvedSubjectId = matchedSub.id;
                }
            }
        }

        if (!resolvedPeriodId || !resolvedSubjectId) {
            return NextResponse.json(
                { error: "Không tìm thấy phân công tương ứng để gửi yêu cầu mở khóa. Vui lòng tải lại trang và thử lại." },
                { status: 404 }
            );
        }

        // Đảm bảo subjectId tồn tại trong AssessmentSubject (tránh lỗi khóa ngoại khi từ synthesized_...)
        const validAssessmentSubject = await prisma.assessmentSubject.findUnique({
            where: { id: resolvedSubjectId }
        });
        if (!validAssessmentSubject) {
            return NextResponse.json(
                { error: "Môn khảo sát không nằm trong danh mục phân công mở khóa tự động. Vui lòng liên hệ Quản trị viên để mở khóa đợt khảo sát." },
                { status: 400 }
            );
        }

        const existingMatch = await prisma.inputAssessmentTeacherAssignment.findFirst({
            where: {
                periodId: resolvedPeriodId,
                batchId: resolvedBatchId || null,
                userId: resolvedUserId,
                subjectId: resolvedSubjectId,
                grade: resolvedGrade,
                educationSystem: resolvedSystem
            }
        });

        if (existingMatch) {
            const record = await prisma.inputAssessmentTeacherAssignment.update({
                where: { id: existingMatch.id },
                data: {
                    unlockRequestStatus: "PENDING",
                    unlockReason: String(reason).trim()
                }
            });
            return NextResponse.json(record);
        }

        const created = await prisma.inputAssessmentTeacherAssignment.create({
            data: {
                periodId: resolvedPeriodId,
                batchId: resolvedBatchId || null,
                userId: resolvedUserId,
                subjectId: resolvedSubjectId,
                grade: resolvedGrade,
                educationSystem: resolvedSystem,
                unlockRequestStatus: "PENDING",
                unlockReason: String(reason).trim()
            }
        });
        return NextResponse.json(created);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
