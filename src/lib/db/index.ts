import { PrismaClient } from "@prisma/client"
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import path from 'path'

const DEFAULT_TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"

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
const TURSO_TOKEN = rawToken

// 2. Local Configuration
const defaultLocalDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/')
const LOCAL_URL = cleanEnv(process.env.LOCAL_DATABASE_URL) || `file:${defaultLocalDbPath}`

// Configured engine: 'AUTO' (default), 'LOCAL', or 'CLOUD'
const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV)
const configuredEngine = (cleanEnv(process.env.DEFAULT_DB_ENGINE) || 'LOCAL').toUpperCase().trim()

// Global engine state: Force CLOUD on Vercel as local SQLite is unavailable. On-premise defaults to LOCAL for maximum sub-millisecond performance.
let currentEngine: 'CLOUD' | 'LOCAL' = isVercel ? 'CLOUD' : (configuredEngine === 'CLOUD' ? 'CLOUD' : 'LOCAL')

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

declare global {
  var prismaGlobal: undefined | PrismaClient
  var __ssmCloudPrismaV2: undefined | PrismaClient
  var __ssmLocalPrismaV2: undefined | PrismaClient
  var __ssmRuntimeDelegatesV2: undefined | Record<string, any>
}

const runtimeDelegatesStore: Record<string, any> =
  globalThis.__ssmRuntimeDelegatesV2 ?? (globalThis.__ssmRuntimeDelegatesV2 = {})

function getCloudPrisma(): PrismaClient {
  if (!globalThis.__ssmCloudPrismaV2) {
    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    globalThis.__ssmCloudPrismaV2 = new PrismaClient({
      adapter,
      transactionOptions: {
        maxWait: 15000,
        timeout: 60000
      }
    })
  }
  return globalThis.__ssmCloudPrismaV2
}

function getLocalPrisma(): PrismaClient {
  if (!globalThis.__ssmLocalPrismaV2) {
    const libsql = createClient({
      url: LOCAL_URL,
    })
    const adapter = new PrismaLibSQL(libsql)
    globalThis.__ssmLocalPrismaV2 = new PrismaClient({
      adapter,
      transactionOptions: {
        maxWait: 15000,
        timeout: 60000
      }
    })
  }
  return globalThis.__ssmLocalPrismaV2
}

let lastCloudFailoverTime = 0
const CLOUD_RECOVERY_COOLDOWN_MS = 60 * 1000 // 60s cooldown

function getActivePrisma(): PrismaClient {
  if (currentEngine === 'LOCAL' && configuredEngine === 'CLOUD') {
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

function wrapSmartPrismaPromise(
  rawPromise: any,
  prop: string | symbol,
  modelProp: string | symbol,
  args: any[]
) {
  if (!rawPromise || (typeof rawPromise !== 'object' && typeof rawPromise !== 'function') || typeof rawPromise.then !== 'function') {
    return rawPromise
  }

  const replayOnLocal = () => {
    const localDelegate = (getLocalPrisma() as any)?.[prop]
    return localDelegate[modelProp].apply(localDelegate, args)
  }

  // Lazy failover executor: only invoked if .then/.catch/.finally is called directly (not when batched in $transaction)
  const executeWithFailover = () =>
    rawPromise.catch((err: any) => {
      if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
        console.warn(
          `[SmartPrisma] Turso Cloud error on ${String(prop)}.${String(modelProp)}. Auto-failing over to Local SQLite (local.db)...`,
          err.message
        )
        currentEngine = 'LOCAL'
        lastCloudFailoverTime = Date.now()
        return replayOnLocal()
      }
      throw err
    })

  return new Proxy(rawPromise, {
    get(target, p, receiver) {
      if (p === '__rawPrismaPromise') return target
      if (p === '__replayOnLocal') return replayOnLocal
      if (p === Symbol.toStringTag) {
        return target[Symbol.toStringTag] ?? 'PrismaPromise'
      }
      if (p === 'then') {
        return (onFulfilled?: any, onRejected?: any) =>
          executeWithFailover().then(onFulfilled, onRejected)
      }
      if (p === 'catch') {
        return (onRejected?: any) => executeWithFailover().catch(onRejected)
      }
      if (p === 'finally') {
        return (onFinally?: any) => executeWithFailover().finally(onFinally)
      }
      const val = Reflect.get(target, p)
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

// Smart Proxy around PrismaClient ensuring seamless failover and safe fallback for runtime delegates
function createSmartPrisma(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    set(_target, prop: string | symbol, newValue: any) {
      ;(_target as any)[prop] = newValue
      if (typeof prop === 'string') {
        runtimeDelegatesStore[prop] = newValue
      }
      return true
    },
    get(_target, prop: string | symbol) {
      const active = getActivePrisma() as any
      const nativeValue = active?.[prop]
      const fallbackValue =
        (_target as any)[prop] ??
        (typeof prop === 'string' ? runtimeDelegatesStore[prop] : undefined)
      const value = nativeValue ?? fallbackValue

      // Top-level methods: $transaction, $queryRaw, $executeRaw, $connect, $disconnect...
      if (typeof value === 'function') {
        // Note: $queryRaw / $executeRaw also return PrismaPromise when used inside batch $transaction([...])
        if (prop === '$queryRaw' || prop === '$executeRaw' || prop === '$queryRawUnsafe' || prop === '$executeRawUnsafe') {
          return (...args: any[]) => {
            const activePrisma = getActivePrisma() as any
            const rawPromise = activePrisma[prop].apply(activePrisma, args)
            if (!rawPromise || typeof rawPromise.then !== 'function') return rawPromise
            const replayRawOnLocal = () => {
              const localPrisma = getLocalPrisma() as any
              return localPrisma[prop].apply(localPrisma, args)
            }
            const execRawWithFailover = () =>
              rawPromise.catch((err: any) => {
                if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
                  console.warn(
                    `[SmartPrisma] Turso Cloud error on ${String(prop)}. Auto-failing over to Local SQLite (local.db)...`,
                    err.message
                  )
                  currentEngine = 'LOCAL'
                  lastCloudFailoverTime = Date.now()
                  return replayRawOnLocal()
                }
                throw err
              })
            return new Proxy(rawPromise, {
              get(target, p) {
                if (p === '__rawPrismaPromise') return target
                if (p === '__replayOnLocal') return replayRawOnLocal
                if (p === Symbol.toStringTag) return target[Symbol.toStringTag] ?? 'PrismaPromise'
                if (p === 'then') return (onF?: any, onR?: any) => execRawWithFailover().then(onF, onR)
                if (p === 'catch') return (onR?: any) => execRawWithFailover().catch(onR)
                if (p === 'finally') return (onFin?: any) => execRawWithFailover().finally(onFin)
                const v = Reflect.get(target, p)
                return typeof v === 'function' ? v.bind(target) : v
              },
            })
          }
        }

        return async (...args: any[]) => {
          const activePrisma = getActivePrisma() as any
          const preparedArgs =
            prop === '$transaction' && Array.isArray(args[0])
              ? [args[0].map((op: any) => op?.__rawPrismaPromise ?? op), ...args.slice(1)]
              : args

          try {
            const fn = activePrisma?.[prop] ?? fallbackValue
            if (typeof fn === 'function') {
              return await fn.apply(activePrisma, preparedArgs)
            }
            return fn
          } catch (err: any) {
            if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
              console.warn(
                `[SmartPrisma] Turso Cloud error on ${String(prop)}. Auto-failing over to Local SQLite (local.db)...`,
                err.message
              )
              currentEngine = 'LOCAL'
              lastCloudFailoverTime = Date.now()
              const localPrisma = getLocalPrisma() as any
              const localFn = localPrisma?.[prop] ?? fallbackValue
              const localArgs =
                prop === '$transaction' && Array.isArray(args[0])
                  ? [
                      args[0].map((op: any) =>
                        typeof op?.__replayOnLocal === 'function'
                          ? op.__replayOnLocal()
                          : (op?.__rawPrismaPromise ?? op)
                      ),
                      ...args.slice(1),
                    ]
                  : args
              if (typeof localFn === 'function') {
                return await localFn.apply(localPrisma, localArgs)
              }
              return localFn
            }
            throw err
          }
        }
      }

      // If it's a runtime fallback delegate (not a native Prisma model), return it directly without wrapping in a recursive proxy
      if (nativeValue === undefined && fallbackValue !== undefined) {
        return fallbackValue
      }

      // Native model delegates: prisma.user, prisma.academicYear, prisma.teacher...
      if (typeof nativeValue === 'object' && nativeValue !== null) {
        return new Proxy(nativeValue, {
          get(_modelTarget, modelProp: string | symbol) {
            const activeDelegate = (getActivePrisma() as any)?.[prop]
            const delegateMethod = activeDelegate?.[modelProp]

            if (typeof delegateMethod === 'function') {
              return (...args: any[]) => {
                const currentDelegate = (getActivePrisma() as any)?.[prop]
                try {
                  const result = currentDelegate[modelProp].apply(currentDelegate, args)
                  return wrapSmartPrismaPromise(result, prop, modelProp, args)
                } catch (err: any) {
                  if (!isVercel && currentEngine === 'CLOUD' && isBlockedOrUnavailable(err)) {
                    console.warn(
                      `[SmartPrisma] Turso Cloud error on ${String(prop)}.${String(modelProp)}. Auto-failing over to Local SQLite (local.db)...`,
                      err.message
                    )
                    currentEngine = 'LOCAL'
                    lastCloudFailoverTime = Date.now()
                    const localDelegate = (getLocalPrisma() as any)?.[prop]
                    return localDelegate[modelProp].apply(localDelegate, args)
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

const createPrismaClient = createSmartPrisma
const prisma = globalThis.prismaGlobal ?? createPrismaClient()

export { prisma }
export default prisma

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma
} else {
  globalThis.prismaGlobal = prisma
}
