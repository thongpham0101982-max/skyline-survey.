import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: any) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "getAssignments") {
        const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: { userId: session.user.id },
            include: {
                subject: true,
                batch: true,
                period: { include: { assignedUser: true } }
            }
        });
        return NextResponse.json(assignments);
    }
    
    if (action === "getStudents") {
        const periodId = searchParams.get("periodId");
        const grade = searchParams.get("grade");
        const systemCode = searchParams.get("systemCode");
        const subjectId = searchParams.get("subjectId");
        const batchId = searchParams.get("batchId");

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
        if (systemName) {
            validSystems.push(systemName.toUpperCase());
            validSystems.push(systemName.toLowerCase());
        }

        const students = await prisma.inputAssessmentStudent.findMany({
            where: {
                periodId: periodId,
                
                ...(batchId ? { OR: [{ batchId: batchId }, { batchId: null }] } : {})
            },
            include: {
                scores: {
                    where: { subjectId: subjectId }
                }
            }
        });

        // Filter in memory to bypass any strict case-sensitivity issues of SQLite
        
        const filteredStudents = students.filter(st => {
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
                scores: {
                    include: { subject: true }
                }
            }
        });
        
        return NextResponse.json(students);
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
