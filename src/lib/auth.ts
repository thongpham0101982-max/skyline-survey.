import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const identifier = credentials.email as string
        let user: any = null

        // 1. Check User table (Email)
        user = await prisma.user.findUnique({ where: { email: identifier } })

        // 2. Check Teacher Code
        if (!user) {
          const teacher = await prisma.teacher.findUnique({
            where: { teacherCode: identifier },
            include: { user: true }
          })
          if (teacher?.user) user = teacher.user
        }

        // 3. Check Parent Code
        if (!user) {
          const parent = await prisma.parent.findUnique({
            where: { parentCode: identifier },
            include: { user: true }
          })
          if (parent?.user) user = parent.user
        }

        // 4. Check Student Code
        if (!user) {
          const student = await prisma.student.findUnique({
            where: { studentCode: identifier },
            include: { user: true }
          })
          if (student?.user) user = student.user
        }

        // 5. Fallback for KT_DBCL by Name
        if (!user) {
          user = await prisma.user.findFirst({ where: { fullName: identifier } })
        }

        if (!user || user.status !== "ACTIVE") return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
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
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
  },
  pages: { signIn: "/login" },
  useSecureCookies: false,
})
