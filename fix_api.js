const fs = require('fs');
const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\teacher-assessments\\route.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');

// We need to fetch all education systems to map code to name
const replacementFilterLogic = `
        let teacherAssignments = [];
        let eduSystemsMap = {};
        if (!grade && !systemCode) {
            teacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
                where: { userId: session.user.id, periodId: periodId || undefined, subjectId: subjectId || undefined }
            });
            
            const sysList = await prisma.educationSystem.findMany();
            sysList.forEach(s => { eduSystemsMap[s.code.toLowerCase()] = s.name.toLowerCase(); });
        }
`;

// Replace the old logic
apiContent = apiContent.replace(
    /let teacherAssignments = \[\];\s*if \(\!grade && \!systemCode\) \{\s*teacherAssignments = await prisma\.inputAssessmentTeacherAssignment\.findMany\(\{\s*where: \{ userId: session\.user\.id, periodId: periodId \|\| undefined, subjectId: subjectId \|\| undefined \}\s*\}\);\s*\}/,
    replacementFilterLogic
);

// Update the sysMatch logic
const newSysMatch = `
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
`;

apiContent = apiContent.replace(
    /const sysMatch = \!taSys \|\| taSys === "tất cả" \|\| stSys === taSys \|\| stSys\.includes\(taSys\) \|\| taSys\.includes\(stSys\);/g,
    newSysMatch
);

// Let's also fix the preschool issue where it just returned all students!
// If subjectId === "preschool", we need to filter by teacher assignments for preschool too.
// Let's check how preschool filtering is done.

fs.writeFileSync(apiPath, apiContent, 'utf8');
console.log('Fixed teacher student filter logic in API');
