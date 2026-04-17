const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function update() {
  const users = await db.user.findMany({ where: { role: 'PARENT' }, include: { parent: true } });
  let count = 0;
  for (const u of users) {
    // If it's a generated PH_ account, change to P_
    if (u.email && u.email.startsWith('PH_')) {
      const newEmail = u.email.replace('PH_', 'P_');
      await db.user.update({ where: { id: u.id }, data: { email: newEmail } });
      count++;
    } 
    // And let's fix the parent1@skyline.edu to proper P_ format based on their student.
    // Wait, the dummy parents are linked to student.
    else if (u.email && u.email.includes('@skyline.edu') && u.email.startsWith('parent')) {
      // Find the parent record
      const parentRecord = await db.parent.findUnique({ where: { userId: u.id }, include: { students: { include: { student: true } } }});
      if (parentRecord && parentRecord.students.length > 0) {
        const studentCode = parentRecord.students[0].student.studentCode;
        const newEmail = `P_${studentCode}`;
        // password for them is 'password123', maybe we leave it or reset it, but let's just update the email so UI shows correct.
        // Wait, UI says 'Mat khau = Ma Hoc Sinh'. The seeds used 'password123', so let's also update the password hash
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(studentCode, 10);
        await db.user.update({
          where: { id: u.id },
          data: { email: newEmail, passwordHash: hash }
        });
        count++;
      }
    }
  }
  console.log('Updated ' + count + ' user accounts.');
}
update().finally(() => db.$disconnect());
