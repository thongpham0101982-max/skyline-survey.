const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function check() {
  const forms = await db.surveyForm.findMany({
    include: { parent: { include: { user: true } }, student: true }
  })
  
  console.log('Forms missing parent userId:')
  console.log(forms.filter(f => !f.parent.userId).map(f => f.student.studentCode))
  
  console.log('Parent1 forms:')
  const p1forms = forms.filter(f => f.parent?.user?.email === 'parent1@skyline.edu')
  console.log(p1forms.map(f => ({ status: f.status, student: f.student.studentCode })))
}
check()