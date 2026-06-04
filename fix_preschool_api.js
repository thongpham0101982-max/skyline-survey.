const fs = require('fs');
const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\teacher-assessments\\route.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');

const preschoolFilterLogic = `
            const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                where,
                // ... select
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
`;

apiContent = apiContent.replace(
    /const studentIds = students\.map\(\(s: any\) => s\.id\);/g,
    preschoolFilterLogic.split('const students =')[1].substring(45) // Hacky way, let's just do an exact replace
);

// Better replace:
const oldLines = `
            const studentIds = students.map((s: any) => s.id);
            
            // Fetch all scores for these students
`;
const newLines = `
            // Filter preschool students by teacher's preschool assignments
            let preschoolAssignments = [];
            if (!grade || grade === "Tất cả") {
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
            } else if ((!grade || grade === "Tất cả") && preschoolAssignments.length === 0) {
                filteredStudents = [];
            }

            const studentIds = filteredStudents.map((s: any) => s.id);
            
            // Fetch all scores for these students
`;

apiContent = apiContent.replace(oldLines, newLines);
apiContent = apiContent.replace(/const enriched = students\.map/g, 'const enriched = filteredStudents.map');

fs.writeFileSync(apiPath, apiContent, 'utf8');
console.log('Fixed preschool student filtering in API');
