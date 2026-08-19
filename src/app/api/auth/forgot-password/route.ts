// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json()
    const raw = String(identifier || '').trim()

    if (!raw) {
      return NextResponse.json({ error: 'Vui lòng nhập Email hoặc Mã tài khoản.' }, { status: 400 })
    }

    let userEmail: string | null = null
    let userName: string = 'Người dùng'
    let targetUserId: string | null = null

    // 1. Direct User table match
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: raw },
          { email: raw.toLowerCase() },
          { email: raw.toUpperCase() }
        ]
      }
    })

    if (user) {
      userEmail = user.email
      userName = user.fullName
      targetUserId = user.id
    }

    // 2. Teacher match (check teacherCode AND email)
    if (!userEmail || !userEmail.includes('@')) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { teacherCode: raw },
            { teacherCode: raw.toUpperCase() },
            { teacherCode: raw.toLowerCase() },
            { email: raw },
            { email: raw.toLowerCase() },
            { email: raw.toUpperCase() }
          ]
        },
        include: { user: true }
      })

      if (teacher) {
        userEmail = teacher.email || teacher.user?.email || userEmail
        userName = teacher.teacherName || teacher.user?.fullName || userName
        targetUserId = teacher.user?.id || teacher.userId || targetUserId
      }
    }

    // 3. Parent match (check parentCode AND email)
    if (!userEmail || !userEmail.includes('@')) {
      const parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { parentCode: raw },
            { parentCode: raw.toUpperCase() },
            { parentCode: raw.toLowerCase() },
            { email: raw },
            { email: raw.toLowerCase() },
            { email: raw.toUpperCase() }
          ]
        },
        include: { user: true }
      })

      if (parent) {
        userEmail = parent.email || parent.user?.email || userEmail
        userName = parent.parentName || parent.user?.fullName || userName
        targetUserId = parent.user?.id || parent.userId || targetUserId
      }
    }

    if (!userEmail || !userEmail.includes('@')) {
      return NextResponse.json({
        error: 'Không tìm thấy thông tin Email liên kết với tài khoản này. Vui lòng liên hệ Ban Khảo thí & ĐBCL để được trợ giúp.'
      }, { status: 404 })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    try {
      await prisma.passwordResetToken.create({
        data: {
          email: userEmail,
          token: resetToken,
          expiresAt
        }
      })
    } catch {
      await prisma.$executeRawUnsafe(
        `INSERT INTO PasswordResetToken (id, email, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`,
        crypto.randomUUID(), userEmail, resetToken, expiresAt.toISOString(), new Date().toISOString()
      ).catch(() => {})
    }

    const reqHost = req.headers.get('host') || 'skyline-survey.vercel.app'
    const protocol = reqHost.includes('localhost') ? 'http' : 'https'
    const resetLink = `${protocol}://${reqHost}/reset-password?token=${resetToken}`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #003B3A; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">SQMS Portal</h1>
          <p style="color: #00D2C4; margin: 4px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Yêu cầu Đặt lại Mật khẩu</p>
        </div>
        <div style="padding: 32px; color: #1e293b;">
          <p style="font-size: 15px; margin-top: 0;">Xin chào <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Hệ thống nhận được yêu cầu cấp lại mật khẩu cho tài khoản liên kết với Email: <strong style="color: #003B3A;">${userEmail}</strong>.</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Nhấn vào nút bên dưới để tiến hành đặt lại mật khẩu mới cho tài khoản của bạn:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #48BFE3; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 800; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(72,191,227,0.3);">Đặt lại Mật khẩu ngay</a>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="font-size: 12px; color: #92400e; margin: 0; font-weight: 700;">⚠️ Lưu ý bảo mật:</p>
            <p style="font-size: 12px; color: #78350f; margin: 4px 0 0 0;">Link này có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ Ban Quản trị.</p>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Sky-Line Education System • SQMS Portal v2.5
        </div>
      </div>
    `

    await sendEmail({
      to: userEmail,
      subject: '[SQMS Portal] Yêu cầu Đặt lại Mật khẩu Tài khoản',
      html: emailHtml
    })

    return NextResponse.json({
      ok: true,
      message: `Đã gửi liên kết khôi phục mật khẩu đến email: ${userEmail}. Vui lòng kiểm tra hộp thư.`
    })

  } catch (e: any) {
    console.error('[FORGOT PASSWORD ERROR]', e)
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
