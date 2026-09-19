import { prisma } from "../db"

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// Global cache store attached to globalThis to survive HMR and process re-entries
const globalRefCache = (globalThis as any).__skylineRefCache || {
  academicYears: null,
  campuses: null,
  departments: null,
  subjects: null,
}
;(globalThis as any).__skylineRefCache = globalRefCache

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getCachedAcademicYears(db?: any): Promise<any[]> {
  const now = Date.now()
  const cached = globalRefCache.academicYears as CacheEntry<any[]> | null

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const client = db || prisma
  try {
    const years = await client.academicYear.findMany({
      orderBy: { startDate: "desc" }
    })
    globalRefCache.academicYears = {
      data: years || [],
      expiresAt: now + DEFAULT_TTL_MS
    }
    return globalRefCache.academicYears.data
  } catch (err) {
    console.error("Error fetching academicYears in getCachedAcademicYears:", err)
    return cached?.data || []
  }
}

export async function getCachedCampuses(db?: any): Promise<any[]> {
  const now = Date.now()
  const cached = globalRefCache.campuses as CacheEntry<any[]> | null

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const client = db || prisma
  try {
    const campuses = await client.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" }
    })
    globalRefCache.campuses = {
      data: campuses || [],
      expiresAt: now + DEFAULT_TTL_MS
    }
    return globalRefCache.campuses.data
  } catch (err) {
    console.error("Error fetching campuses in getCachedCampuses:", err)
    return cached?.data || []
  }
}

export async function getCachedDepartments(db?: any): Promise<any[]> {
  const now = Date.now()
  const cached = globalRefCache.departments as CacheEntry<any[]> | null

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const client = db || prisma
  try {
    const departments = await client.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    })
    globalRefCache.departments = {
      data: departments || [],
      expiresAt: now + DEFAULT_TTL_MS
    }
    return globalRefCache.departments.data
  } catch (err) {
    console.error("Error fetching departments in getCachedDepartments:", err)
    return cached?.data || []
  }
}

export async function getCachedSubjects(db?: any): Promise<any[]> {
  const now = Date.now()
  const cached = globalRefCache.subjects as CacheEntry<any[]> | null

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const client = db || prisma
  try {
    const subjects = await client.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })
    globalRefCache.subjects = {
      data: subjects || [],
      expiresAt: now + DEFAULT_TTL_MS
    }
    return globalRefCache.subjects.data
  } catch (err) {
    console.error("Error fetching subjects in getCachedSubjects:", err)
    return cached?.data || []
  }
}

export function invalidateReferenceCache(key?: "academicYears" | "campuses" | "departments" | "subjects"): void {
  if (key) {
    globalRefCache[key] = null
  } else {
    globalRefCache.academicYears = null
    globalRefCache.campuses = null
    globalRefCache.departments = null
    globalRefCache.subjects = null
  }
}
