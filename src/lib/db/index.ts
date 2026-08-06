import fs from 'fs'
import path from 'path'
import os from 'os'
import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const VALID_TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const VALID_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

// Force Next.js NFT static trace engine to bundle dev.db and prisma/dev.db into Vercel Lambda bundle
let tracedDbContent: Buffer | null = null;
try {
  tracedDbContent = fs.readFileSync(path.join(process.cwd(), 'dev.db'));
} catch (e) {
  try {
    tracedDbContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'dev.db'));
  } catch (e2) {}
}

// Copy bundled dev.db to OS temp directory (/tmp) which is guaranteed writable on Vercel Lambda
let sqliteTmpPath = ''
try {
  const tmpDir = os.tmpdir() || '/tmp'
  sqliteTmpPath = path.join(tmpDir, 'skyline_dev.db')
  
  if (tracedDbContent && tracedDbContent.length > 100) {
    fs.writeFileSync(sqliteTmpPath, tracedDbContent)
  } else if (!fs.existsSync(sqliteTmpPath) || fs.statSync(sqliteTmpPath).size < 100) {
    const header = Buffer.alloc(4096)
    header.write('SQLite format 3\0', 0, 'binary')
    header.writeUInt16BE(4096, 16)
    header.writeUInt8(1, 18)
    header.writeUInt8(1, 19)
    fs.writeFileSync(sqliteTmpPath, header)
  }
  process.env.DATABASE_URL = 'file:' + sqliteTmpPath
} catch (e) {}

const createPrismaClient = () => {
  let rawUrl = process.env.TURSO_DATABASE_URL || VALID_TURSO_URL
  let tursoUrl = rawUrl.replace(/^libsql:///, 'https://')
  if (!tursoUrl.startsWith('https://')) tursoUrl = VALID_TURSO_URL

  let tursoAuthToken = process.env.TURSO_AUTH_TOKEN || VALID_TURSO_TOKEN
  if (!tursoAuthToken || tursoAuthToken.includes('eyJhIjoicnciLCJleHAiOjE3ODQxODUxMTQs')) {
    tursoAuthToken = VALID_TURSO_TOKEN
  }

  if (sqliteTmpPath) {
    process.env.DATABASE_URL = 'file:' + sqliteTmpPath
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
