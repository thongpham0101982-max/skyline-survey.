import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client/web'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

let rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || "").trim()
const TURSO_URL = rawUrl ? rawUrl.replace(/^libsql:\/\//, 'https://') : "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "").trim()

const createPrismaClient = () => {
  const libsql = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma = globalThis.prismaGlobal ?? createPrismaClient()

export { prisma }

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
