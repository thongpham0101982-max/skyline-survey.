import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import fs from 'fs'
import path from 'path'
import os from 'os'

const VALID_TURSO_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const VALID_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

const ensureDummyFiles = () => {
  const pathsToEnsure = [
    path.join(process.cwd(), 'dev.db'),
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(os.tmpdir() || '/tmp', 'skyline_dev.db')
  ]
  for (const p of pathsToEnsure) {
    try {
      const dir = path.dirname(p)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(p)) fs.writeFileSync(p, '')
    } catch (e) {}
  }
  return 'file:' + pathsToEnsure[0]
}

const createPrismaClient = () => {
  let tursoUrl = process.env.TURSO_DATABASE_URL || VALID_TURSO_URL
  if (!tursoUrl.startsWith('libsql://')) tursoUrl = VALID_TURSO_URL

  let tursoAuthToken = process.env.TURSO_AUTH_TOKEN || VALID_TURSO_TOKEN
  if (!tursoAuthToken || tursoAuthToken.includes('eyJhIjoicnciLCJleHAiOjE3ODQxODUxMTQs')) {
    tursoAuthToken = VALID_TURSO_TOKEN
  }

  const dummyUrl = ensureDummyFiles()
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
