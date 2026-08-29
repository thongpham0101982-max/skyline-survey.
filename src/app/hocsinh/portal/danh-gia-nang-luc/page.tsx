"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, User, Award } from "lucide-react";
import { StudentCompetencyPortfolio } from "@/components/competency/StudentCompetencyPortfolio";

export default function StudentCompetencyPage() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hocsinh/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.studentCode) {
          setStudent(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 font-sans text-slate-800 pb-20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Link
          href="/hocsinh/portal"
          className="inline-flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-2xl border border-teal-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Cổng Học Sinh
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Đang tải hồ sơ năng lực...</div>
      ) : student ? (
        <StudentCompetencyPortfolio
          studentId={student.id}
          studentCode={student.studentCode}
          studentName={student.studentName}
          initialAcademicYearId={student.academicYearId}
        />
      ) : (
        <div className="p-12 text-center text-xs text-slate-400">Không tìm thấy thông tin học sinh.</div>
      )}
    </div>
  );
}
