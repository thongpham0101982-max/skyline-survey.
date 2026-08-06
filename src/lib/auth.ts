// @ts-nocheck
﻿import NextAuth, { CredentialsSignin } from "next-auth"

class InactiveUserError extends CredentialsSignin {
  code = "TAI_KHOAN_BI_KHOA"
}
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

async function getClientIp() {
  try {
    const { headers } = require('next/headers');
    const reqHeaders = await headers();
    return reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
  } catch (e) {
    return '127.0.0.1';
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "skyline-survey-super-secret-key-change-in-production",
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Account", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const rawIdentifier = (credentials.email as string || '').trim()
        const password = credentials.password as string
        let user: any = null

        // 1. Direct Email / Account Lookup in User table
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: rawIdentifier },
                { email: rawIdentifier.toLowerCase() },
                { email: rawIdentifier.toUpperCase() }
              ]
            }
          })
          if (user) {
            console.log('[AUTH] User found via Email/Account:', rawIdentifier)
          }
        }

        // 2. Teacher Code Match
        if (!user) {
          const teacher = await prisma.teacher.findFirst({
            where: {
              OR: [
                { teacherCode: rawIdentifier },
                { teacherCode: rawIdentifier.toUpperCase() },
                { teacherCode: rawIdentifier.toLowerCase() }
              ]
            },
            include: { user: true }
          })
          if (teacher?.user) {
            user = teacher.user
            console.log('[AUTH] User found via Teacher Code:', rawIdentifier)
          }
        }

        // 3. Parent Code Match (P + Mã HS or parentCode)
        if (!user) {
          const parentCodeVariation = rawIdentifier.toUpperCase().startsWith('P') 
            ? rawIdentifier.toUpperCase() 
            : 'P' + rawIdentifier.toUpperCase();
            
          const parent = await prisma.parent.findFirst({
            where: {
              OR: [
                { parentCode: rawIdentifier },
                { parentCode: rawIdentifier.toUpperCase() },
                { parentCode: rawIdentifier.toLowerCase() },
                { parentCode: parentCodeVariation }
              ]
            },
            include: { user: true }
          })
          if (parent?.user) {
            user = parent.user
            console.log('[AUTH] User found via Parent Code:', rawIdentifier)
          }
        }

        const identifier = rawIdentifier

        if (!user) {
          console.log('[AUTH] User not found for identifier:', identifier)
          await prisma.auditLog.create({
            data: {
              userId: "N/A",
              userEmail: identifier,
              action: "LOGIN_FAILED",
              targetTable: "User",
              targetId: "N/A",
              newValues: "Tài khoản không tồn tại",
              ipAddress: await getClientIp()
            }
          }).catch(() => {});
          return null
        }

        if (user.status !== "ACTIVE") {
          console.log('[AUTH] User found but not ACTIVE status:', user.status)
          throw new InactiveUserError()
        }

        // Validate Password
        const isValid = await bcrypt.compare(password, user.passwordHash)
        console.log('[AUTH] Password check for:', identifier, 'Result:', isValid)
        if (!isValid) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              userEmail: identifier,
              action: "LOGIN_FAILED",
              targetTable: "User",
              targetId: user.id,
              newValues: "Sai mật khẩu",
              ipAddress: await getClientIp()
            }
          }).catch(() => {});
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          campusIds: user.campusAssignments?.map((a: any) => a.campusId) || []
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  events: {
    async signIn({ user }) {
      await prisma.auditLog.create({
        data: {
          userId: user.id || "N/A",
          userEmail: user.email || "N/A",
          action: "LOGIN_SUCCESS",
          targetTable: "User",
          targetId: user.id || "N/A",
          newValues: `Đăng nhập thành công (Vai trò: ${user.role || "N/A"})`,
          ipAddress: await getClientIp()
        }
      }).catch((e) => console.error("Error logging signin event:", e));
    },
    async signOut({ token }) {
      if (token) {
        await prisma.auditLog.create({
          data: {
            userId: (token.id as string) || "N/A",
            userEmail: (token.email as string) || "N/A",
            action: "LOGOUT",
            targetTable: "User",
            targetId: (token.id as string) || "N/A",
            newValues: "Đăng xuất thành công",
            ipAddress: await getClientIp()
          }
        }).catch((e) => console.error("Error logging signout event:", e));
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.campusIds = (user as any).campusIds
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).campusIds = token.campusIds as string[]
      }
      return session
    },
  },
  pages: { signIn: "/login" },
})
