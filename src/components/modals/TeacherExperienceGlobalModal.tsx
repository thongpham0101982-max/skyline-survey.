"use client"

import React, { useState, useEffect } from "react"
import { TeacherExperienceConfirmModal } from "@/app/teacher/du-gio/components/TeacherExperienceConfirmModal"
import { confirmTeacherExperienceCategory } from "@/app/teacher/du-gio/actions"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface TeacherExperienceGlobalModalProps {
  teacherId: string
  teacherName: string
  academicYearName: string
  academicYearId: string
  currentObserverType?: string | null
}

export function TeacherExperienceGlobalModal({
  teacherId,
  teacherName,
  academicYearName,
  academicYearId,
  currentObserverType = null
}: TeacherExperienceGlobalModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if dismissed in this browser session
    const dismissKey = `dismiss_exp_modal_${academicYearId || 'default'}`
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey) === "true") {
      return
    }
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 700)
    return () => clearTimeout(timer)
  }, [academicYearId])

  const handleClose = () => {
    setIsOpen(false)
    const dismissKey = `dismiss_exp_modal_${academicYearId || 'default'}`
    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissKey, "true")
    }
  }

  const handleConfirm = async (category: "NEW" | "EXPERIENCED") => {
    setIsSubmitting(true)
    try {
      const res = await confirmTeacherExperienceCategory({
        category,
        academicYearId
      })
      if (res.success) {
        toast.success(
          category === "NEW"
            ? "Đã xác nhận Giáo viên mới (< 2 năm): 06 tiết dự/tháng, 01 tiết dạy/tháng."
            : "Đã xác nhận Giáo viên cũ (≥ 2 năm): 02 tiết dự/tháng, 01 tiết dạy/học kỳ."
        )
        setIsOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "Không thể lưu xác nhận chỉ tiêu")
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu xác nhận")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <TeacherExperienceConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      academicYearName={academicYearName}
      teacherName={teacherName}
      currentObserverType={currentObserverType}
      isSubmitting={isSubmitting}
    />
  )
}
