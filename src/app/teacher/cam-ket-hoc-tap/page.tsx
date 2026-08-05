"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TeacherCommitmentPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/teacher/ho-tro-hoc-tap")
  }, [router])

  return (
    <div className="p-8 text-center text-slate-500">
      Đang chuyển hướng...
    </div>
  )
}
