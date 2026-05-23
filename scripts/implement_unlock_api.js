const fs = require('fs');
let c = fs.readFileSync('src/app/api/teacher-assessments/route.ts', 'utf8');

if (!c.includes('export async function PUT')) {
    c += `

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
`;
    fs.writeFileSync('src/app/api/teacher-assessments/route.ts', c, 'utf8');
}
console.log('API updated');
