const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const depts = await prisma.department.findMany({
    select: { id: true, name: true, code: true, blockCM: true }
  });
  console.log('--- ALL DEPARTMENTS ---');
  depts.forEach(d => console.log(`ID: ${d.id} | Name: "${d.name}" | Code: "${d.code}" | Block: "${d.blockCM}"`));

  const allTeachers = await prisma.teacher.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      teacherName: true,
      teacherCode: true,
      position: true,
      campus: { select: { campusName: true } },
      departmentRel: { select: { id: true, name: true, code: true } },
      departmentAssignments: { select: { department: { select: { id: true, name: true, code: true } } } },
      user: { select: { role: true } }
    }
  });

  console.log('--- ALL ACTIVE TEACHERS (COUNT: ' + allTeachers.length + ') ---');
  const eng = allTeachers.filter(t => {
    const deptName = t.departmentRel?.name || '';
    const assignedDepts = t.departmentAssignments?.map(a => a.department?.name).join(', ') || '';
    const pos = t.position || '';
    return deptName.toLowerCase().includes('tiếng anh') || 
           deptName.toLowerCase().includes('english') || 
           deptName.toLowerCase().includes('quốc tế') ||
           pos.toLowerCase().includes('gvnn') ||
           pos.toLowerCase().includes('tiếng anh') ||
           assignedDepts.toLowerCase().includes('tiếng anh');
  });
  console.log('Found ' + eng.length + ' English / GVNN teachers:');
  eng.forEach(t => {
    console.log(`Teacher: "${t.teacherName}" (${t.teacherCode}) | Dept: "${t.departmentRel?.name}" | Assigned: "${t.departmentAssignments?.map(a=>a.department?.name).join(', ')}" | Pos: "${t.position}"`);
  });
}
main().finally(() => prisma.$disconnect());
