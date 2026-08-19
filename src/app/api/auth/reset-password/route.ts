// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()
    const cleanToken = String(token || '').trim()
    const password = String(newPassword || '').trim()

    if (!cleanToken) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn.' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' }, { status: 400 })
    }

    let resetRecord: any = null
    try {
      resetRecord = await prisma.passwordResetToken.findUnique({
        where: { token: cleanToken }
      })
    } catch {
      const rows: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM PasswordResetToken WHERE token = ? LIMIT 1`, cleanToken
      ).catch(() => [])
      resetRecord = rows[0] || null
    }

    if (!resetRecord) {
      return NextResponse.json({ error: 'Mã khôi phục mật khẩu không tồn tại hoặc đã được sử dụng.' }, { status: 400 })
    }

    if (new Date(resetRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link khôi phục mật khẩu đã hết hạn (quá 15 phút). Vui lòng gửi lại yêu cầu.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: resetRecord.email },
          { email: resetRecord.email.toLowerCase() }
        ]
      }
    })

    if (!user) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: resetRecord.email },
            { email: resetRecord.email.toLowerCase() }
          ]
        },
        include: { user: true }
      })
      if (teacher?.user) user = teacher.user
    }

    if (!user) {
      const parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { email: resetRecord.email },
            { email: resetRecord.email.toLowerCase() }
          ]
        },
        include: { user: true }
      })
      if (parent?.user) user = parent.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng sở hữu email này.' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    await prisma.passwordResetToken.deleteMany({
      where: { email: resetRecord.email }
    }).catch(() => {})

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "PASSWORD_RESET_SUCCESS",
        targetTable: "User",
        targetId: user.id,
        newValues: "Đã đặt lại mật khẩu mới qua Email khôi phục"
      }
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.'
    })

  } catch (e: any) {
    console.error('[RESET PASSWORD ERROR]', e)
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
