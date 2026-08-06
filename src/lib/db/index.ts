import fs from 'fs'
import path from 'path'
import os from 'os'

const VALID_TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const VALID_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

// Force process.env.DATABASE_URL to Turso URL BEFORE loading PrismaClient module
// This prevents Prisma's engine from attempting local SQLite file open on Vercel
try {
  delete process.env.DATABASE_URL;
  delete process.env.TURSO_DATABASE_URL;
  process.env.DATABASE_URL = VALID_TURSO_URL;
  process.env.TURSO_DATABASE_URL = VALID_TURSO_URL;
} catch (e) {}

// Import PrismaClient and LibSQL after process.env.DATABASE_URL is set to remote URL
const { PrismaClient } = require("@prisma/client")
const { createClient } = require('@libsql/client/web')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')

const createPrismaClient = () => {
  let tursoUrl = VALID_TURSO_URL
  let tursoAuthToken = VALID_TURSO_TOKEN

  if (process.env.TURSO_AUTH_TOKEN && !process.env.TURSO_AUTH_TOKEN.includes('eyJhIjoicnciLCJleHAiOjE3ODQxODUxMTQs')) {
    tursoAuthToken = process.env.TURSO_AUTH_TOKEN
  }

  process.env.DATABASE_URL = VALID_TURSO_URL

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
