const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function check() {
  const notifs = await db.notification.findMany({
    include: { user: true }
  })
  console.log('Total notifications:', notifs.length)
  if (notifs.length > 0) {
    console.log(notifs.slice(0, 5).map(n => ({
      userId: n.userId,
      email: n.user.email,
      title: n.title
    })))
  }

  const p1 = await db.user.findUnique({ where: { email: 'parent1@skyline.edu' }})
  console.log('Parent1 ID:', p1?.id)
}
check()