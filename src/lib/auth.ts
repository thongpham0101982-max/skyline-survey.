import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || "skyline-survey-super-secret-key-change-in-production",
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

        let identifier = credentials.email as string
        const password = credentials.password as string
        let user: any = null

        console.log('[AUTH] Attempting login for:', identifier)
        // 1. Direct User table match (Admin / Staff)
        user = await prisma.user.findUnique({ where: { email: identifier }, include: { campusAssignments: true } })
        console.log('[AUTH] User found in User table:', user ? 'YES' : 'NO')

        // 2. Teacher Code Match
        if (!user) {
          const teacher = await prisma.teacher.findUnique({
            where: { teacherCode: identifier },
            include: { user: true }
          })
          if (teacher?.user) {
            user = teacher.user
            console.log('[AUTH] User found via Teacher Code:', identifier)
          }
        }

        // 3. Parent Code Match (P + Mã HS)
        if (!user) {
          const parent = await prisma.parent.findUnique({
            where: { parentCode: identifier },
            include: { user: true }
          })
          if (parent?.user) {
            user = parent.user
            console.log('[AUTH] User found via Parent Code:', identifier)
          }
        }

        // 4. Student Code Match
        if (!user) {
          const student = await prisma.student.findUnique({
            where: { studentCode: identifier },
            include: { user: true }
          })
          if (student?.user) {
            user = student.user
            console.log('[AUTH] User found via Student Code:', identifier)
          }
        }

        if (!user) {
          console.log('[AUTH] User not found for identifier:', identifier)
          return null
        }

        if (user.status !== "ACTIVE") {
          console.log('[AUTH] User found but not ACTIVE status:', user.status)
          return null
        }

        // Validate Password
        const isValid = await bcrypt.compare(password, user.passwordHash)
        console.log('[AUTH] Password check for:', identifier, 'Result:', isValid)
        if (!isValid) return null

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
