import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import path from 'path'

// 1. Cloud Configuration
let rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || "").trim()
if (rawUrl.startsWith("file:")) {
  rawUrl = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
}
const TURSO_URL = rawUrl ? rawUrl.replace(/^libsql:\/\//, 'https://') : "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "").trim()

// 2. Local Configuration
const defaultLocalDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/')
const LOCAL_URL = (process.env.LOCAL_DATABASE_URL || `file:${defaultLocalDbPath}`).trim()

// Configured engine: 'AUTO' (default), 'LOCAL', or 'CLOUD'
const configuredEngine = (process.env.DEFAULT_DB_ENGINE || 'AUTO').toUpperCase().trim()

// Global engine state
let currentEngine: 'CLOUD' | 'LOCAL' = configuredEngine === 'LOCAL' ? 'LOCAL' : 'CLOUD'

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

function getActivePrisma(): PrismaClient {
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
            if (currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
              console.warn(
                `[SmartPrisma] Turso Cloud error on ${String(prop)}. Auto-failing over to Local SQLite (local.db)...`,
                err.message
              )
              currentEngine = 'LOCAL'
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
                  if (currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
                    console.warn(
                      `[SmartPrisma] Turso Cloud error on ${String(prop)}.${String(modelProp)}. Auto-failing over to Local SQLite (local.db)...`,
                      err.message
                    )
                    currentEngine = 'LOCAL'
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
