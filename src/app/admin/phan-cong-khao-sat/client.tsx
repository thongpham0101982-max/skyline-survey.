"use client"
import { useState } from "react"
import { GraduationCap, Baby } from "lucide-react"
import { PhanCongK12Client } from "./k12-client"
import { PhanCongMamNonClient } from "./mam-non-client"

interface Props {
  academicYears: any[]
  k12Periods: any[]
  preschoolPeriods: any[]
  teachers: any[]
  departments: any[]
  subjects: any[]
  eduSystems: any[]
  k12Grades: string[]
  preschoolGrades: string[]
  campuses: any[]
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null
  rolePermissions?: any[]
}

export function PhanCongKhaoSatClient({
  academicYears = [],
  k12Periods = [],
  preschoolPeriods = [],
  teachers = [],
  departments = [],
  subjects = [],
  eduSystems = [],
  k12Grades = [],
  preschoolGrades = [],
  campuses = [],
  currentUser = null,
  rolePermissions = []
}: Props) {
  const [activeTab, setActiveTab] = useState<"k12" | "preschool">("k12")

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Tab Selector */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex gap-2 w-fit">
        <button
          onClick={() => setActiveTab("k12")}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
            activeTab === "k12"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Phân công K-12
        </button>
        <button
          onClick={() => setActiveTab("preschool")}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
            activeTab === "preschool"
              ? "bg-teal-600 text-white shadow-lg shadow-teal-100 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Baby className="w-4 h-4" />
          Phân công Mầm non
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-350 ease-in-out">
        {activeTab === "k12" ? (
          <PhanCongK12Client
            academicYears={academicYears}
            initialPeriods={k12Periods}
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            eduSystems={eduSystems}
            grades={k12Grades}
            campuses={campuses}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
          />
        ) : (
          <PhanCongMamNonClient
            academicYears={academicYears}
            initialPeriods={preschoolPeriods}
            teachers={teachers}
            departments={departments}
            campuses={campuses}
            grades={preschoolGrades}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
          />
        )}
      </div>
    </div>
  )
}
