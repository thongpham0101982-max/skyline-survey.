export const dynamic = "force-dynamic";
﻿// @ts-nocheck
﻿import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getSurveyFormAgeGroup } from "@/lib/preschool"

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

    if (action === "getAssignments") {
        const academicYearId = searchParams.get("academicYearId");
        
        let whereClause = { userId: session.user.id };
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

        // Fetch preschool assignments (filter by userId only; academicYear filtered below in memory)
        const preschoolAssignmentsRaw = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
            where: { userId: session.user.id },
            include: {
                batch: true,
                period: { include: { assignedUser: true } }
            }
        });

        // Filter by academicYear in-memory (relation filter may not work on preschool model)
        const preschoolAssignments = academicYearId
            ? preschoolAssignmentsRaw.filter((a: any) => a.period?.academicYearId === academicYearId)
            : preschoolAssignmentsRaw;

        const mappedPreschool = preschoolAssignments.map((a: any) => ({
            id: a.id,
            periodId: a.periodId,
            batchId: a.batchId,
            userId: a.userId,
            subjectId: "preschool",
            grade: a.grade,
            isPreschool: true,
            subject: {
                id: "preschool",
                name: "Đánh giá Mầm non",
                code: "PRESCHOOL",
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
        }));

        try {
            const currentTeacher = await prisma.teacher.findUnique({
                where: { userId: session.user.id }
            });

            if (currentTeacher) {
                const probationStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                    where: {
                        probationaryTeacher: currentTeacher.teacherName,
                        ...(academicYearId ? {
                            period: { academicYearId: academicYearId }
                        } : {})
                    },
                    select: {
                        periodId: true,
                        period: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                status: true,
                                assignedUser: {
                                    select: { id: true, fullName: true, email: true }
                                }
                            }
                        }
                    },
                    distinct: ["periodId"]
                });

                probationStudents.forEach((p: any) => {
                    if (p.period) {
                        mappedPreschool.push({
                            id: `preschool-probation-${p.periodId}`,
                            periodId: p.periodId,
                            batchId: null,
                            userId: session.user.id,
                            subjectId: "preschool-probation",
                            grade: "Học thử",
                            isPreschool: true,
                            isPreschoolProbation: true,
                            subject: {
                                id: "preschool-probation",
                                name: "Đánh giá Học thử (Mầm non)",
                                code: "PRESCHOOL_PROBATION",
                                scoreColumns: 1,
                                commentColumns: 1,
                            },
                            batch: null,
                            period: p.period
                        });
                    }
                });
            }
        } catch (eError) {
            console.error("Error fetching virtual probationary assignments:", eError);
        }

        return NextResponse.json([...assignments, ...mappedPreschool]);
    }
    
    if (action === "getStats") {
        const academicYearId = searchParams.get("academicYearId");
        if (!academicYearId) {
            return NextResponse.json({ total: 0, grades: {} });
        }

        const currentTeacher = await prisma.teacher.findUnique({
            where: { userId: session.user.id }
        });

        if (!currentTeacher) {
            return NextResponse.json({ total: 0, grades: {} });
        }

        const teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: {
                userId: session.user.id,
                period: { academicYearId: academicYearId }
            }
        });

        const preschoolAssignmentsRaw = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
            where: { userId: session.user.id },
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
        // Count assignments
        const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: { userId: session.user.id },
            include: { period: true }
        });
        
        let validAssignments = assignments;
        if (academicYearId) {
            // Check if period belongs to academic year. If academicYear isn't on period, this might not work perfectly, 
            // but we'll approximate or just return all assignments if period doesn't have academicYearId.
            // Let's just return all for the teacher for now, since period filtering is complex if not directly linked.
        }
        
        const totalAssignments = validAssignments.length;
        
        // Count distinct classes assigned (by grade and system)
        const uniqueClasses = new Set();
        validAssignments.forEach(a => {
            if (a.grade) uniqueClasses.add(a.grade + "_" + a.educationSystem);
        });
        const totalClasses = uniqueClasses.size;
        
        let academicYearName = "";
        if (academicYearId) {
            const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
            if (year) academicYearName = year.name;
        }
        
        // This is an approximation
        return NextResponse.json({
            totalClasses,
            totalStudents: totalClasses * 25, // Mock data or query real data
            totalAssignments,
            scoredStudents: 0,
            academicYearName
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
                const currentTeacher = await prisma.teacher.findUnique({
                    where: { userId: session.user.id }
                });
                if (!currentTeacher) {
                    return NextResponse.json([]);
                }
                const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                    where: {
                        periodId: periodId,
                        probationaryTeacher: currentTeacher.teacherName,
                        ...(batchId && batchId !== "all" && batchId !== "null" ? {
                            OR: [
                                { batchId: batchId },
                                { batchId: null }
                            ]
                        } : {})
                    },
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

                    const resolvedAgeGroup = s.grade || "Mầm non";
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
                    where: { userId: session.user.id, periodId: periodId || undefined }
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
        
        // Luon load teacherAssignments de kiem tra quyen va loc dung khoi/he
        const teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: { userId: session.user.id, periodId: periodId || undefined, subjectId: subjectId || undefined }
        });
        
        const sysList = await prisma.educationSystem.findMany();
        const eduSystemsMap: Record<string, Set<string>> = {};
        sysList.forEach(s => {
            const code = s.code.toLowerCase();
            if (!eduSystemsMap[code]) eduSystemsMap[code] = new Set();
            eduSystemsMap[code].add(s.name.toLowerCase());
        });

        const assignedGrades = Array.from(new Set(teacherAssignments.map(ta => ta.grade).filter(Boolean)));
        const students = await prisma.inputAssessmentStudent.findMany({
            where: {
                periodId: periodId || undefined,
                ...(batchId ? { OR: [{ batchId: batchId }, { batchId: null }] } : {}),
                ...(assignedGrades.length > 0 && !assignedGrades.includes("tất cả") && !assignedGrades.includes("Tất cả") ? {
                    grade: { in: assignedGrades }
                } : {})
            },            include: {
                scores: {
                    where: { subjectId: subjectId || undefined },
                    include: { subject: true }
                }
            }
        });

        // Filter in memory to bypass any strict case-sensitivity issues of SQLite
        
        
        const filteredStudents = students.filter(st => {
            // Check teacher assignments first
            if (teacherAssignments.length > 0) {
                // The student must match at least one of the teacher's assignments for this subject
                const stGrade = (st.grade || "").toLowerCase().trim();
                const stSys = (st.surveyFormType || "").toLowerCase().trim();
                
                const matchesAssignment = teacherAssignments.some(ta => {
                    const taGrade = (ta.grade || "").toLowerCase().trim();
                    const taSys = (ta.educationSystem || "").toLowerCase().trim();
                    
                    // FIX: So sánh số khối chính xác, tránh lỗi "10".includes("1") = true
                    const taGradeNum = taGrade.replace("khối", "").trim();
                    const stGradeNum = stGrade.replace("khối", "").trim();
                    const gradeMatch = !taGrade || taGrade === "tất cả" || stGrade === taGrade ||
                        (stGradeNum !== "" && taGradeNum !== "" && stGradeNum === taGradeNum);                    let sysMatch = false;
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

                    
                    return gradeMatch && sysMatch;
                });
                
                if (!matchesAssignment) return false;
            } else if (!grade && !systemCode) {
                // Neu khong co assignment nao, GV khong nen thay hoc sinh nao
                return false;
            }
            // Loc theo khoi cu the (neu GV chon tu bo loc Khoi tren UI)
            if (grade && grade.trim() !== "" && grade !== "Tất cả") {
                const stGrade = (st.grade || "").toLowerCase().trim();
                const qGrade = grade.toLowerCase().trim();
                const qGradeNum = qGrade.replace("khối", "").trim();
                
                const stGradeNum = stGrade.replace("khối", "").trim();
                if (stGrade) {
                    // FIX: So sánh số khối chính xác (không dùng includes)
                    const matchGrade = stGrade === qGrade || stGradeNum === qGradeNum;
                    if (!matchGrade) return false;
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
        

        return NextResponse.json(filteredStudents);
    }

    
    if (action === "getReport") {
        const periodId = searchParams.get("periodId");
        if (!periodId) return NextResponse.json({error: "Missing periodId"}, {status:400});
        
        const students = await prisma.inputAssessmentStudent.findMany({
            where: { 
                periodId: periodId,
                isAbsent: { not: true }
            },
            orderBy: [{ grade: 'asc' }, { fullName: 'asc' }],
            include: {
                batch: true,
                scores: {
                    include: { subject: true }
                }
            }
        });
        
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
    const { studentId, subjectId, scores, comments } = body;

    // -- SECURITY HARDENING: Check if Period or Batch is Locked --
    const student = await prisma.inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
    });
    if (!student) return NextResponse.json({error: "Student not found"}, {status: 404});

    const isPrtLocked = student.period?.status !== "ACTIVE";
    const isBtcLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    
    if (isPrtLocked || isBtcLocked) {
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

    const record = await prisma.studentAssessmentScore.upsert({
        where: {
            studentId_subjectId: { studentId, subjectId }
        },
        create: {
            studentId,
            subjectId,
            scores: JSON.stringify(scores),
            comments: JSON.stringify(comments),
            teacherId: session.user?.id || null,
            teacherName: session.user?.fullName || session.user?.name || "Tài khoản chia sẻ"
        },
        update: {
            scores: JSON.stringify(scores),
            comments: JSON.stringify(comments),
            teacherId: session.user?.id || null,
            teacherName: session.user?.fullName || session.user?.name || "Tài khoản chia sẻ"
        }
    });

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
    const { action, assignmentId, reason } = body;

    if (action === "requestUnlock") {
        const record = await prisma.inputAssessmentTeacherAssignment.update({
            where: { id: assignmentId },
            data: {
                unlockRequestStatus: "PENDING",
                unlockReason: reason
            }
        });
        return NextResponse.json(record);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
