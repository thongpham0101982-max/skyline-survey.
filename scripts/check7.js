const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function push() {
  const p1 = await db.user.findUnique({ where: { email: 'parent1@skyline.edu' }})
  if (p1) {
    await db.notification.create({
      data: {
        userId: p1.id,
        title: 'Lời nhắc: Hoàn thành khảo sát (Gửi bù)',
        message: 'Kính gửi Phụ huynh, phiếu khảo sát đánh giá chất lượng đang chờ PH thực hiện. Xin cảm ơn!'
      }
    })
    console.log('Pushed to Parent1')
  }
}
push()