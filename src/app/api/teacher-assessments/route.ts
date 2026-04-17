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

        const students = await prisma.inputAssessmentStudent.findMany({
            where: {
                periodId: periodId,
                grade: grade || undefined,
                surveySystem: systemCode || undefined
            },
            include: {
                scores: {
                    where: { subjectId: subjectId }
                }
            }
        });
        return NextResponse.json(students);
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
