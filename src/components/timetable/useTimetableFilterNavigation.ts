"use client"

import { useCallback, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { TimetableFilterParams } from "@/lib/timetable/types"

/**
 * Prevents race conditions & stale state overwrites when rapidly changing filters:
 * - Increments `requestSeqRef` on every load
 * - Discards out-of-order responses from older filter requests
 * - Syncs clean query parameters to URL without polluting blank values
 */
export function useTimetableFilterNavigation<TData>(
  initialData: TData,
  fetcher: (params: TimetableFilterParams) => Promise<{ success: boolean; error?: string } & Record<string, any>>
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<TData>(initialData)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestSeqRef = useRef(0)

  const readCurrentParams = useCallback((): TimetableFilterParams => {
    return {
      academicYearId: searchParams?.get("academicYearId") || undefined,
      semester: searchParams?.get("semester") ? Number(searchParams.get("semester")) : undefined,
      scopeGroup: (searchParams?.get("scopeGroup") as any) || undefined,
      campusId: searchParams?.get("campusId") || undefined,
      levelCode: (searchParams?.get("levelCode") as any) || undefined,
      grade: searchParams?.get("grade") || undefined,
      classId: searchParams?.get("classId") || undefined,
      versionId: searchParams?.get("versionId") || undefined,
      viewedWeekDate: searchParams?.get("viewedWeekDate") || undefined,
    }
  }, [searchParams])

  const reloadWithPatch = useCallback(
    async (patch: Partial<TimetableFilterParams> = {}) => {
      const merged: TimetableFilterParams = {
        ...readCurrentParams(),
        ...patch,
      }

      const qs = new URLSearchParams()
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "ALL") {
          qs.set(k, String(v))
        }
      })
      const targetUrl = qs.toString() ? `${pathname}?${qs.toString()}` : pathname || ""
      router.replace(targetUrl, { scroll: false })

      const seq = ++requestSeqRef.current
      setLoading(true)
      setErrorMessage(null)

      try {
        const res = await fetcher(merged)
        if (seq !== requestSeqRef.current) {
          // Stale response from an older filter selection — discard!
          return null
        }
        if (!res.success) {
          setErrorMessage(res.error || "Không thể tải dữ liệu thời khóa biểu.")
          return null
        }
        setData(res as unknown as TData)
        return res as unknown as TData
      } catch (e: any) {
        if (seq === requestSeqRef.current) {
          setErrorMessage(e?.message || "Lỗi kết nối máy chủ.")
        }
        return null
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false)
        }
      }
    },
    [fetcher, pathname, readCurrentParams, router]
  )

  return {
    data,
    setData,
    loading,
    errorMessage,
    setErrorMessage,
    reloadWithPatch,
  }
}
