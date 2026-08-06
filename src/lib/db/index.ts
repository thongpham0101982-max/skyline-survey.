import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client/web'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

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
