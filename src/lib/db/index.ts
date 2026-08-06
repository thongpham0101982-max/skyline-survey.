import fs from 'fs'
import path from 'path'
import os from 'os'
import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const VALID_TURSO_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const VALID_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

// Top-level module execution: ensure valid SQLite files exist at all expected paths BEFORE Prisma engine init
try {
  const tmpDir = os.tmpdir() || '/tmp'
  const targetDb = path.join(tmpDir, 'skyline_dev.db')
  if (!fs.existsSync(targetDb) || fs.statSync(targetDb).size < 100) {
    const header = Buffer.alloc(4096)
    header.write('SQLite format 3\0', 0, 'binary')
    header.writeUInt16BE(4096, 16)
    header.writeUInt8(1, 18)
    header.writeUInt8(1, 19)
    fs.writeFileSync(targetDb, header)
  }

  const candidatePaths = [
    path.join(process.cwd(), 'dev.db'),
    path.join(process.cwd(), 'prisma', 'dev.db')
  ]

  for (const p of candidatePaths) {
    try {
      const dir = path.dirname(p)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
        fs.writeFileSync(p, fs.readFileSync(targetDb))
      }
    } catch (e) {}
  }
  process.env.DATABASE_URL = 'file:' + candidatePaths[0]
} catch (e) {}

const createPrismaClient = () => {
  let tursoUrl = process.env.TURSO_DATABASE_URL || VALID_TURSO_URL
  if (!tursoUrl.startsWith('libsql://')) tursoUrl = VALID_TURSO_URL

  let tursoAuthToken = process.env.TURSO_AUTH_TOKEN || VALID_TURSO_TOKEN
  if (!tursoAuthToken || tursoAuthToken.includes('eyJhIjoicnciLCJleHAiOjE3ODQxODUxMTQs')) {
    tursoAuthToken = VALID_TURSO_TOKEN
  }

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
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
