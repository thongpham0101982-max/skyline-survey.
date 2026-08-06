import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import fs from 'fs'
import path from 'path'
import os from 'os'

const VALID_TURSO_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const VALID_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

const ensureValidSqliteFile = () => {
  const tmpDir = os.tmpdir() || '/tmp'
  const targetDb = path.join(tmpDir, 'skyline_dev.db')

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'prisma', 'prisma', 'dev.db')
    ]

    let foundSrc = ''
    for (const src of candidatePaths) {
      if (fs.existsSync(src) && fs.statSync(src).size > 100) {
        foundSrc = src
        break
      }
    }

    if (foundSrc) {
      fs.copyFileSync(foundSrc, targetDb)
    } else if (!fs.existsSync(targetDb) || fs.statSync(targetDb).size < 100) {
      const header = Buffer.alloc(4096)
      header.write('SQLite format 3\0', 0, 'binary')
      header.writeUInt16BE(4096, 16)
      header.writeUInt8(1, 18)
      header.writeUInt8(1, 19)
      fs.writeFileSync(targetDb, header)
    }

    try {
      const localDev = path.join(process.cwd(), 'dev.db')
      if (!fs.existsSync(localDev) || fs.statSync(localDev).size < 100) {
        fs.copyFileSync(targetDb, localDev)
      }
    } catch (e) {}

  } catch (e) {}

  return 'file:' + targetDb
}

const createPrismaClient = () => {
  let tursoUrl = process.env.TURSO_DATABASE_URL || VALID_TURSO_URL
  if (!tursoUrl.startsWith('libsql://')) tursoUrl = VALID_TURSO_URL

  let tursoAuthToken = process.env.TURSO_AUTH_TOKEN || VALID_TURSO_TOKEN
  if (!tursoAuthToken || tursoAuthToken.includes('eyJhIjoicnciLCJleHAiOjE3ODQxODUxMTQs')) {
    tursoAuthToken = VALID_TURSO_TOKEN
  }

  const sqliteFileUrl = ensureValidSqliteFile()
  process.env.DATABASE_URL = sqliteFileUrl

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
