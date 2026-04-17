const fs = require('fs');
let c = fs.readFileSync('src/app/api/teacher-assessments/route.ts', 'utf8');

const reportCode = `
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
`;

c = c.replace(/return NextResponse\.json\(\{ error: "Invalid action" \}, \{ status: 400 \}\);/, reportCode + '\n    return NextResponse.json({ error: "Invalid action" }, { status: 400 });');
fs.writeFileSync('src/app/api/teacher-assessments/route.ts', c, 'utf8');
