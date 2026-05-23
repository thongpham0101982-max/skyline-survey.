const fs = require('fs');
let c = fs.readFileSync('src/app/api/input-assessment-assignments/route.ts', 'utf8');

if (!c.includes('export async function PUT')) {
    c += `
export async function PUT(req) {
  try {
    const body = await req.json();
    const { action, id, status } = body;
    
    if (action === "RESOLVE_UNLOCK") {
       await prisma.inputAssessmentTeacherAssignment.update({
          where: { id },
          data: { unlockRequestStatus: status }
       });
       return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
    fs.writeFileSync('src/app/api/input-assessment-assignments/route.ts', c, 'utf8');
}
console.log('Admin API for resolving requests added');
