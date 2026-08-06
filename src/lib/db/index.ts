import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import fs from 'fs'
import path from 'path'
import os from 'os'

const ensureDummyFile = () => {
  try {
    const tmpDir = os.tmpdir() || '/tmp'
    const dummyPath = path.join(tmpDir, 'skyline_dev.db')
    if (!fs.existsSync(dummyPath)) {
      fs.writeFileSync(dummyPath, '')
    }
    return 'file:' + dummyPath
  } catch (e) {
    return 'file:./dev.db'
  }
}

const createPrismaClient = () => {
  const tursoUrl = process.env.TURSO_DATABASE_URL || "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

  // Ensure DATABASE_URL points to a valid file on disk to satisfy SQLite engine init
  const dummyUrl = ensureDummyFile()
  process.env.DATABASE_URL = dummyUrl

  if (tursoUrl && tursoUrl.startsWith('libsql://')) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma = globalThis.prismaGlobal ?? createPrismaClient()

export { prisma }

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
