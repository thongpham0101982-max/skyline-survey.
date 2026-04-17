const fs = require('fs');

let api = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
api = api.replace(
    'campus: true }',
    'campus: true, assignedUser: { select: { fullName: true } } }'
);
if (!api.includes('assignedUserId: data.assignedUserId || null')) {
    api = api.split('campusId: data.campusId || null,').join('campusId: data.campusId || null,\n           assignedUserId: data.assignedUserId || null,');
}
fs.writeFileSync('src/app/api/input-assessments/route.ts', api, 'utf8');
console.log('API updated.');

let page = fs.readFileSync('src/app/admin/input-assessments/page.tsx', 'utf8');
if (!page.includes('let examBoardUsers =')) {
    page = page.split('let campuses = [];').join('let campuses = [];\n  let examBoardUsers = [];');
    page = page.split(\"campuses = await prisma.campus.findMany({ orderBy: { campusName: 'asc' } });\").join(\"campuses = await prisma.campus.findMany({ orderBy: { campusName: 'asc' } });\n    examBoardUsers = await prisma.user.findMany({ where: { role: 'KT_DBCL' }, select: { id: true, fullName: true } });\");
    page = page.split('<InputAssessmentsClient academicYears={academicYears} campuses={campuses} />').join('<InputAssessmentsClient academicYears={academicYears} campuses={campuses} examBoardUsers={examBoardUsers} />');
    fs.writeFileSync('src/app/admin/input-assessments/page.tsx', page, 'utf8');
    console.log('Page updated.');
}
