const fs = require('fs');

const clientPath = 'src/app/teacher/input-assessments/client.tsx';
let code = fs.readFileSync(clientPath, 'utf8');

// 1. Add uniqueAssignments definition
const search1 = 'const availableAssignments = useMemo(() => {';
const replace1 = `const uniqueAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const map = new Map();
        assignments.filter(a => a.periodId === selectedPeriodId).forEach(a => {
            const key = \`\${a.subjectId}-\${a.batchId || ''}\`;
            if (!map.has(key)) map.set(key, a);
        });
        return Array.from(map.values());
    }, [assignments, selectedPeriodId]);

    const availableAssignments = useMemo(() => {`;
code = code.replace(search1, replace1);

// 2. Change relatedEnglishAssignments filtering
const search2 = `    const relatedEnglishAssignments = isEnglishAssignment ? availableAssignments.filter(a => 
        (a.subject?.name?.toLowerCase().includes("tiếng anh") || a.subject?.code?.toLowerCase().includes("eng") || a.subject?.code?.toLowerCase().includes("esl")) &&
        a.grade === currentAssignment.grade &&
        a.educationSystem === currentAssignment.educationSystem &&
        a.batchId === currentAssignment.batchId &&
        a.periodId === currentAssignment.periodId
    ).sort((a,b) => (a.subject?.name || "").localeCompare(b.subject?.name || "")) : [];`;

const replace2 = `    const relatedEnglishAssignments = isEnglishAssignment ? uniqueAssignments.filter(a => 
        (a.subject?.name?.toLowerCase().includes("tiếng anh") || a.subject?.code?.toLowerCase().includes("eng") || a.subject?.code?.toLowerCase().includes("esl")) &&
        a.batchId === currentAssignment.batchId &&
        a.periodId === currentAssignment.periodId
    ).sort((a,b) => (a.subject?.name || "").localeCompare(b.subject?.name || "")) : [];`;
code = code.replace(search2, replace2);

// 3. Change dropdown to use uniqueAssignments and just the subject name
const search3 = `{availableAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"}) {a.batch?.name ? \` - \${a.batch.name}\` : ""}
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}`;

const replace3 = `{uniqueAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name}{a.batch?.name ? \` - \${a.batch.name}\` : ""}
                                </option>
                            ))}
                            {uniqueAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}`;
code = code.replace(search3, replace3);

fs.writeFileSync(clientPath, code, 'utf8');
