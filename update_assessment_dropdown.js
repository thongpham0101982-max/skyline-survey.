const fs = require('fs');

const clientPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\teacher\\input-assessments\\client.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

// We want to change how `availableAssignments` is computed. 
// We want to group by subject name, so the dropdown options are simple.

const replacementAvailableAssignments = `
    const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const filtered = assignments.filter(a => a.periodId === selectedPeriodId && (selectedBatchId === "all" || !a.batchId || a.batchId === selectedBatchId));
        
        // Group by subjectId to consolidate the dropdown
        const unique = new Map();
        filtered.forEach(a => {
            const subNameNormalized = (a.subject?.name || "").toLowerCase().normalize("NFC");
            const subCode = (a.subject?.code || "").toLowerCase();
            const gradeVal = String(a.grade || "").replace("Khối ", "").trim();
            const isChildDev = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
            
            if (isChildDev) {
                const key = a.subjectId; // Group ALL Child Dev into one subject
                if (!unique.has(key)) {
                    unique.set(key, { ...a, overrideSystemLabel: "", overrideSystemCode: "", grade: "" });
                }
            } else if (a.isPreschool) {
                const key = "preschool";
                if (!unique.has(key)) {
                    unique.set(key, { ...a, id: "preschool-all", grade: "", overrideSystemLabel: "", subject: { ...a.subject, name: "Đánh giá Mầm non" } });
                }
            } else {
                const key = a.subjectId;
                if (!unique.has(key)) {
                    unique.set(key, { ...a, overrideSystemLabel: "", overrideSystemCode: "", grade: "" });
                }
            }
        });
        
        return Array.from(unique.values());
    }, [assignments, selectedPeriodId, selectedBatchId]);
`;

// Replace the old availableAssignments logic
clientContent = clientContent.replace(/const availableAssignments = useMemo\(\(\) => \{[\s\S]*?return \[\.\.\.finalPreschoolList, \.\.\.finalNonPreschoolList\];\n    \}, \[assignments, selectedPeriodId, selectedBatchId\]\);/g, replacementAvailableAssignments);

// We need to change the dropdown option text
clientContent = clientContent.replace(
    /\{a\.subject\?\.name\} - Khối \{a\.grade \|\| "Tất cả"\} \(\{a\.overrideSystemLabel \|\| a\.educationSystem \|\| "Tất cả"\}\)/g,
    '{a.subject?.name}'
);

// We need to change the API call in client.tsx to NOT send systemCode and grade
clientContent = clientContent.replace(
    /const systemCode = [^;]+;/g,
    'const systemCode = "";'
);
clientContent = clientContent.replace(
    /const grade = assignment\.grade \|\| "";/g,
    'const grade = "";'
);

fs.writeFileSync(clientPath, clientContent, 'utf8');
console.log('Updated client.tsx to simplify dropdown');

const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\teacher-assessments\\route.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');

// Let's modify the API so if grade="" and systemCode="", it filters students by the teacher's valid assignments
// Wait, doing this via Regex is tough. Let's just find the `const students = await prisma.inputAssessmentStudent.findMany` part.

const apiFilterLogic = `
        let teacherAssignments = [];
        if (!grade && !systemCode) {
            teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
                where: { userId: session.user.id, periodId: periodId || undefined, subjectId: subjectId || undefined }
            });
        }
`;

if (!apiContent.includes('let teacherAssignments = [];')) {
    apiContent = apiContent.replace(
        'const validSystems = [systemCode, systemName].filter(Boolean) as string[];',
        `const validSystems = [systemCode, systemName].filter(Boolean) as string[];
        
        ${apiFilterLogic}
        `
    );

    apiContent = apiContent.replace(
        'const filteredStudents = students.filter(st => {',
        `const filteredStudents = students.filter(st => {
            // Check teacher assignments first
            if (teacherAssignments.length > 0) {
                // The student must match at least one of the teacher's assignments for this subject
                const stGrade = (st.grade || "").toLowerCase().trim();
                const stSys = (st.surveyFormType || "").toLowerCase().trim();
                
                const matchesAssignment = teacherAssignments.some(ta => {
                    const taGrade = (ta.grade || "").toLowerCase().trim();
                    const taSys = (ta.educationSystem || "").toLowerCase().trim();
                    
                    const gradeMatch = !taGrade || taGrade === "tất cả" || stGrade === taGrade || stGrade.includes(taGrade.replace("khối", "").trim());
                    const sysMatch = !taSys || taSys === "tất cả" || stSys === taSys || stSys.includes(taSys) || taSys.includes(stSys);
                    
                    return gradeMatch && sysMatch;
                });
                
                if (!matchesAssignment) return false;
            }`
    );
    
    fs.writeFileSync(apiPath, apiContent, 'utf8');
    console.log('Updated API to filter students by teacher assignments safely');
}

