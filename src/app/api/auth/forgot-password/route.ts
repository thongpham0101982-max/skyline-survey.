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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yêu cầu Đặt lại Mật khẩu</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 28px 12px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
                
                <!-- HEADER BANNER -->
                <tr>
                  <td bgcolor="#003B3A" style="padding: 30px 28px; text-align: center; background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%);">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="padding-bottom: 8px;">
                          <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3;">
                            YÊU CẦU ĐẶT LẠI MẬT KHẨU
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 6px;">
                          <div style="font-size: 12px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.3px;">
                            CỔNG THÔNG TIN QUẢN TRỊ CHẤT LƯỢNG GIÁO DỤC (SQMS)
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- MAIN CONTENT -->
                <tr>
                  <td style="padding: 32px 28px 24px 28px; color: #1E293B;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">
                      Kính gửi Thầy/Cô <strong>${userName}</strong>,
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      Hệ thống ghi nhận yêu cầu đặt lại mật khẩu đăng nhập cho tài khoản liên kết với địa chỉ email: <strong style="color: #003B3A; background-color: #F0FDFA; padding: 2px 6px; border-radius: 4px; border: 1px solid #CCFBF1;">${userEmail}</strong>.
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      Để bảo mật và kích hoạt mật khẩu mới, Thầy/Cô vui lòng nhấp vào liên kết xác thực bên dưới:
                    </p>

                    <!-- BULLETPROOF CTA BUTTON -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto; border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                          <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #FFFFFF; font-weight: 700; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                            🔐 ĐẶT LẠI MẬT KHẨU NGAY
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- SECURITY WARNING BOX -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border-left: 4px solid #D97706; border-radius: 8px; margin: 24px 0;">
                      <tr>
                        <td style="padding: 14px 16px;">
                          <div style="font-size: 13px; font-weight: 700; color: #92400E; margin-bottom: 4px;">
                            ⚠️ LƯU Ý BẢO MẬT QUAN TRỌNG:
                          </div>
                          <div style="font-size: 12px; color: #78350F; line-height: 1.5;">
                            Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> kể từ thời điểm gửi. Nếu Thầy/Cô không yêu cầu cấp lại mật khẩu, xin vui lòng bỏ qua email này hoặc thông báo ngay cho Quản trị viên để bảo vệ tài khoản.
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 16px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.5; word-break: break-all;">
                      Nếu nút trên không phản hồi, Thầy/Cô có thể sao chép và dán trực tiếp đường dẫn sau vào trình duyệt web:<br>
                      <a href="${resetLink}" style="color: #00A19A; text-decoration: underline;">${resetLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- OFFICIAL BRAND FOOTER -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 24px 28px; text-align: center; border-top: 3px solid #00A19A;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                      BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                    </p>
                    <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                      Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                      Đây là thư điện tử được gửi tự động từ Hệ thống SQMS. Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const emailRes = await sendEmail({
      to: userEmail,
      subject: '[SQMS Portal] Yêu cầu Đặt lại Mật khẩu Tài khoản',
      html: emailHtml
    })

    if (!emailRes.success) {
      return NextResponse.json({
        error: `Không thể gửi email đặt lại mật khẩu: ${emailRes.error || 'Lỗi kết nối SMTP'}. Vui lòng liên hệ Ban Khảo thí.`
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `Đã gửi liên kết khôi phục mật khẩu đến email: ${userEmail}. Vui lòng kiểm tra hộp thư.`
    })

  } catch (e: any) {
    console.error('[FORGOT PASSWORD ERROR]', e)
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
