const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\teacher-assessments\\route.ts';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const targetStr = `        const totalClasses = uniqueClasses.size;
        
        // This is an approximation
        return NextResponse.json({
            totalClasses,
            totalStudents: totalClasses * 25, // Mock data or query real data
            totalAssignments,
            scoredStudents: 0
        });`;

const newStr = `        const totalClasses = uniqueClasses.size;
        
        let academicYearName = "";
        if (academicYearId) {
            const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
            if (year) academicYearName = year.name;
        }
        
        // This is an approximation
        return NextResponse.json({
            totalClasses,
            totalStudents: totalClasses * 25, // Mock data or query real data
            totalAssignments,
            scoredStudents: 0,
            academicYearName
        });`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Fixed API metrics");
} else {
    console.log("NOT FOUND in API");
}
