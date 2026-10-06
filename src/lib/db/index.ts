import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import path from 'path'

const DEFAULT_TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

function cleanEnv(val?: string | null): string {
  if (!val) return ""
  let s = String(val).trim()
  while ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

// 1. Cloud Configuration
let rawUrl = cleanEnv(process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL)
if (!rawUrl || rawUrl.startsWith("file:")) {
  rawUrl = DEFAULT_TURSO_URL
}
const TURSO_URL = rawUrl.replace(/^libsql:\/\//i, 'https://')

let rawToken = cleanEnv(process.env.TURSO_AUTH_TOKEN)
if (!rawToken && TURSO_URL.includes("authToken=")) {
  try {
    const parsed = new URL(TURSO_URL)
    rawToken = parsed.searchParams.get("authToken") || ""
  } catch {}
}
const TURSO_TOKEN = rawToken || DEFAULT_TURSO_TOKEN

// 2. Local Configuration
const defaultLocalDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/')
const LOCAL_URL = cleanEnv(process.env.LOCAL_DATABASE_URL) || `file:${defaultLocalDbPath}`

// Configured engine: 'AUTO' (default), 'LOCAL', or 'CLOUD'
const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV)
const configuredEngine = (cleanEnv(process.env.DEFAULT_DB_ENGINE) || 'AUTO').toUpperCase().trim()

// Global engine state: Force CLOUD on Vercel as local SQLite is unavailable
let currentEngine: 'CLOUD' | 'LOCAL' = (isVercel || configuredEngine !== 'LOCAL') ? 'CLOUD' : 'LOCAL'

// Helper: detect if an error indicates Turso plan block, quota exceeded, or network unavailable
export function isBlockedOrUnavailable(err: any): boolean {
  if (!err) return false
  const msg = String(err?.message || err?.cause || err || '').toLowerCase()
  return (
    msg.includes('blocked') ||
    msg.includes('forbidden') ||
    msg.includes('upgrade your plan') ||
    msg.includes('reads are blocked') ||
    msg.includes('unauthorized') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('status 402') ||
    msg.includes('status 403')
  )
}

let cloudPrismaInstance: PrismaClient | null = null
let localPrismaInstance: PrismaClient | null = null

function getCloudPrisma(): PrismaClient {
  if (!cloudPrismaInstance) {
    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    cloudPrismaInstance = new PrismaClient({ adapter })
  }
  return cloudPrismaInstance
}

function getLocalPrisma(): PrismaClient {
  if (!localPrismaInstance) {
    const libsql = createClient({
      url: LOCAL_URL,
    })
    const adapter = new PrismaLibSQL(libsql)
    localPrismaInstance = new PrismaClient({ adapter })
  }
  return localPrismaInstance
}

let lastCloudFailoverTime = 0
const CLOUD_RECOVERY_COOLDOWN_MS = 60 * 1000 // 60s cooldown

function getActivePrisma(): PrismaClient {
  if (currentEngine === 'LOCAL' && configuredEngine !== 'LOCAL') {
    if (Date.now() - lastCloudFailoverTime > CLOUD_RECOVERY_COOLDOWN_MS) {
      currentEngine = 'CLOUD'
      console.log('[SmartPrisma] Cooldown elapsed. Automatically trying Turso CLOUD engine...')
    }
  }
  return currentEngine === 'LOCAL' ? getLocalPrisma() : getCloudPrisma()
}

export function getCurrentEngine(): 'CLOUD' | 'LOCAL' {
  return currentEngine
}

export function setDbEngine(engine: 'CLOUD' | 'LOCAL') {
  currentEngine = engine
  console.log(`[SmartPrisma] Database engine manually set to: ${engine}`)
}

// Smart Proxy around PrismaClient ensuring seamless failover
function createSmartPrisma(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop: string | symbol) {
      const active = getActivePrisma()
      const value = (active as any)[prop]

      // Top-level methods: $transaction, $queryRaw, $executeRaw, $connect, $disconnect...
      if (typeof value === 'function') {
        return async (...args: any[]) => {
          try {
            return await (getActivePrisma() as any)[prop](...args)
          } catch (err: any) {
            if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
              console.warn(
                `[SmartPrisma] Turso Cloud error on ${String(prop)}. Auto-failing over to Local SQLite (local.db)...`,
                err.message
              )
              currentEngine = 'LOCAL'
              lastCloudFailoverTime = Date.now()
              return await (getLocalPrisma() as any)[prop](...args)
            }
            throw err
          }
        }
      }

      // Model delegates: prisma.user, prisma.academicYear, prisma.teacher...
      if (typeof value === 'object' && value !== null) {
        return new Proxy(value, {
          get(_modelTarget, modelProp: string | symbol) {
            const activeDelegate = (getActivePrisma() as any)[prop]
            const delegateMethod = activeDelegate?.[modelProp]

            if (typeof delegateMethod === 'function') {
              return async (...args: any[]) => {
                try {
                  return await (getActivePrisma() as any)[prop][modelProp](...args)
                } catch (err: any) {
                  if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
                    console.warn(
                      `[SmartPrisma] Turso Cloud error on ${String(prop)}.${String(modelProp)}. Auto-failing over to Local SQLite (local.db)...`,
                      err.message
                    )
                    currentEngine = 'LOCAL'
                    lastCloudFailoverTime = Date.now()
                    return await (getLocalPrisma() as any)[prop][modelProp](...args)
                  }
                  throw err
                }
              }
            }
            return delegateMethod
          }
        })
      }

      return value
    }
  })
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma = globalThis.prismaGlobal ?? createSmartPrisma()

export { prisma }

globalThis.prismaGlobal = prisma
