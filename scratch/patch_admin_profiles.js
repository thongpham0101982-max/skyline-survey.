const fs = require('fs');
const filePath = 'src/app/api/admin/student-profiles/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const startKey = '// Pre-aggregate cross-record scores, summaries & grade entries by studentCode';
const endKey = '// Fetch K12 and Preschool entrance surveys scoped to current students';

const sIdx = content.indexOf(startKey);
const eIdx = content.indexOf(endKey);

if (sIdx !== -1 && eIdx !== -1) {
  const newCross = `// Pre-aggregate cross-record advisory by studentCode
    const crossScoreMap = new Map<string, { goals: any[]; goalTrackings: any[]; termEvaluations: any[] }>();
    if (studentCodesArr.length > 0) {
      try {
        const crossRecs = await prisma.student.findMany({
          where: { studentCode: { in: studentCodesArr } },
          select: {
            studentCode: true,
            goals: { include: { actions: true }, orderBy: { createdAt: "desc" } },
            goalTrackings: { orderBy: { createdAt: "desc" } },
            termEvaluations: { orderBy: { createdAt: "desc" } }
          }
        });
        for (const cr of crossRecs) {
          if (!crossScoreMap.has(cr.studentCode)) {
            crossScoreMap.set(cr.studentCode, { goals: [], goalTrackings: [], termEvaluations: [] });
          }
          const b = crossScoreMap.get(cr.studentCode)!;
          (cr.goals || []).forEach((g: any) => {
            if (!b.goals.some((ex: any) => ex.id === g.id || (ex.category === g.category && ex.targetText === g.targetText))) b.goals.push(g);
          });
          (cr.goalTrackings || []).forEach((gt: any) => {
            if (!b.goalTrackings.some((ex: any) => ex.id === gt.id)) b.goalTrackings.push(gt);
          });
          (cr.termEvaluations || []).forEach((te: any) => {
            if (!b.termEvaluations.some((ex: any) => ex.id === te.id || ex.term === te.term)) b.termEvaluations.push(te);
          });
        }
      } catch (crErr) {
        console.error("Error pre-aggregating cross advisory in admin student-profiles:", crErr);
      }
    }

    `;
  content = content.substring(0, sIdx) + newCross + content.substring(eIdx);
  console.log('Replaced crossScoreMap successfully');
  fs.writeFileSync(filePath, content, 'utf8');
} else {
  console.error('Indices not found for crossScoreMap:', { sIdx, eIdx });
}
