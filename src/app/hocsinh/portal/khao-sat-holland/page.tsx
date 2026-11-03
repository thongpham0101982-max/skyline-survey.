"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import SklPsychCatalogHub from "@/components/advisory/SklPsychCatalogHub"
import { type SklPsychTestCode } from "@/lib/advisory/skl-psych-suite"

function StudentSklPsychPageInner() {
  const searchParams = useSearchParams()
  const [academicYearId, setAcademicYearId] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAcademicYearId(localStorage.getItem("selectedAcademicYear") || "")
    }
  }, [])

  const rawTest = (searchParams?.get("test") || "").toUpperCase()
  const initialTestCode = (
    ["DISC", "EPI", "HOLLAND", "LYUSIN_EQ", "MBTI"].includes(rawTest)
      ? rawTest
      : undefined
  ) as SklPsychTestCode | undefined

  return (
    <div className="max-w-[1360px] mx-auto pb-12">
      <SklPsychCatalogHub
        academicYearId={academicYearId}
        viewerRole="STUDENT"
        initialTestCode={initialTestCode}
      />
    </div>
  )
}

export default function StudentSklPsychPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1360px] mx-auto bg-white rounded-2xl p-10 border border-slate-200/80 text-center text-xs font-semibold text-slate-500 animate-pulse">
          Đang tải Hệ thống Khảo sát Tâm lý & Hướng nghiệp (DISC • EPI • HOLLAND • EQ • MBTI)...
        </div>
      }
    >
      <StudentSklPsychPageInner />
    </Suspense>
  )
}
