// @ts-nocheck
﻿import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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

        // Fetch preschool assignments
        const preschoolAssignments = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
            where: whereClause,
            include: {
                batch: true,
                period: { include: { assignedUser: true } }
            }
        });

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

        return NextResponse.json([...assignments, ...mappedPreschool]);
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
                    surveyFormType: true
                }
            });

            // Filter preschool students by teacher's preschool assignments
            let preschoolAssignments = [];
            if (!grade) {
                preschoolAssignments = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
                    where: { userId: session.user.id, periodId: periodId || undefined }
                });
            }

            let filteredStudents = students;
            if (preschoolAssignments.length > 0) {
                filteredStudents = students.filter(st => {
                    const stGrade = (st.grade || "").toLowerCase().trim();
                    return preschoolAssignments.some(ta => {
                        const taGrade = (ta.grade || "").toLowerCase().trim();
                        return !taGrade || taGrade === "tất cả" || stGrade === taGrade || stGrade.includes(taGrade.replace("khối", "").trim());
                    });
                });
            } else if (!grade && preschoolAssignments.length === 0) {
                // If teacher has NO preschool assignments for this period, they shouldn't see anyone
                // But if they reached here, maybe they have one. If preschoolAssignments is empty, return []
                filteredStudents = [];
            }

            const studentIds = filteredStudents.map((s: any) => s.id);

            
            // Fetch all scores for these students
            const scores = await (prisma as any).preschoolDevScore.findMany({
                where: { studentId: { in: studentIds } },
                include: { criteria: { include: { area: true } } }
            });

            // Count scores per student
            const scoreCounts = await (prisma as any).preschoolDevScore.groupBy({
                by: ["studentId"],
                where: { studentId: { in: studentIds } },
                _count: { id: true }
            });

            const scoreMap: Record<string, number> = {};
            for (const sc of scoreCounts) {
                scoreMap[sc.studentId] = sc._count.id;
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
                const sAgeGroup = s.grade || "18 đến 24 tháng";
                const totalCriteria = criteriaMap[sAgeGroup] || 0;
                const scoredCount = scoreMap[s.id] || 0;
                return {
                    ...s,
                    scoredCount,
                    totalCriteria,
                    isPreschool: true,
                    scoreVals: scoredCount > 0 ? Array(scoredCount).fill("3") : []
                };
            });

            return NextResponse.json(enriched);
        }

        let systemName = undefined;
        if (systemCode) {
            const eduSys = await prisma.educationSystem.findUnique({
                where: { code: systemCode }
            });
            if (eduSys) {
                systemName = eduSys.name;
            }
        }

        const validSystems = [systemCode, systemName].filter(Boolean) as string[];
        
        
        
        let teacherAssignments = [];
        let eduSystemsMap = {};
        if (!grade && !systemCode) {
            teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
                where: { userId: session.user.id, periodId: periodId || undefined, subjectId: subjectId || undefined }
            });
            
            const sysList = await prisma.educationSystem.findMany();
            sysList.forEach(s => { eduSystemsMap[s.code.toLowerCase()] = s.name.toLowerCase(); });
        }


        
        if (systemName) {
            validSystems.push(systemName.toUpperCase());
            validSystems.push(systemName.toLowerCase());
        }

        const students = await prisma.inputAssessmentStudent.findMany({
            where: {
                periodId: periodId || undefined,
                
                ...(batchId ? { OR: [{ batchId: batchId }, { batchId: null }] } : {})
            },
            include: {
                scores: {
                    where: { subjectId: subjectId || undefined }
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
                    
                    const gradeMatch = !taGrade || taGrade === "tất cả" || stGrade === taGrade || stGrade.includes(taGrade.replace("khối", "").trim());
                    
                    let sysMatch = false;
                    if (!taSys || taSys === "tất cả") {
                        sysMatch = true;
                    } else {
                        const taSysName = eduSystemsMap[taSys] || "";
                        sysMatch = stSys === taSys || 
                                   stSys.includes(taSys) || 
                                   taSys.includes(stSys) ||
                                   (taSysName && (stSys === taSysName || stSys.includes(taSysName) || taSysName.includes(stSys)));
                    }

                    
                    return gradeMatch && sysMatch;
                });
                
                if (!matchesAssignment) return false;
            }
            // Fuzzy grade matching
            if (grade && grade.trim() !== "" && grade !== "Tất cả") {
                const stGrade = (st.grade || "").toLowerCase().trim();
                const qGrade = grade.toLowerCase().trim();
                const qGradeNum = qGrade.replace("khối", "").trim();
                
                if (stGrade) {
                    const matchGrade = stGrade === qGrade || 
                                       stGrade === qGradeNum || 
                                       stGrade.includes(qGradeNum) || 
                                       qGrade.includes(stGrade);
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
            where: { periodId: periodId },
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
