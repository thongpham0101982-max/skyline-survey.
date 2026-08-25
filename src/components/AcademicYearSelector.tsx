"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

export function AcademicYearSelector() {
  const pathname = usePathname();
  const [years, setYears] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sqms_academic_years_cache");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [selectedYear, setSelectedYear] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAcademicYear") || null;
    }
    return null;
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(years.length === 0);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await fetch("/api/academic-years").catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setYears(data);
            try {
              sessionStorage.setItem("sqms_academic_years_cache", JSON.stringify(data));
            } catch (e) {}
            const active = data.find(y => y.status === "ACTIVE");
            const defaultId = active ? active.id : (data.length > 0 ? data[0].id : null);
            if (defaultId) {
              const stored = localStorage.getItem("selectedAcademicYear");
              const currentId = stored && data.some(y => y.id === stored) ? stored : defaultId;
              setSelectedYear(currentId);
              localStorage.setItem("selectedAcademicYear", currentId);
              document.cookie = "selectedAcademicYear=" + currentId + "; path=/; max-age=31536000; SameSite=Lax";
              if (currentId !== stored) {
                window.dispatchEvent(new Event("academicYearChanged"));
              }
            }
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, []);

  const handleSelect = (id: string) => {
    setSelectedYear(id);
    setIsOpen(false);
    localStorage.setItem("selectedAcademicYear", id);
    document.cookie = "selectedAcademicYear=" + id + "; path=/; max-age=31536000; SameSite=Lax";
    window.dispatchEvent(new Event("academicYearChanged"));
    window.location.reload();
  };

  const isPortal = pathname.startsWith("/admin") || pathname.startsWith("/teacher") || pathname.startsWith("/parent") || pathname.startsWith("/hocsinh");
  if (!isPortal || loading || years.length === 0) return null;

  const current = years.find(y => y.id === selectedYear) || years[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
      >
        <CalendarIcon className="w-4 h-4 text-[#1E8B87]" />
        <span className="text-xs font-semibold text-slate-700">{current.name}</span>
        <ChevronDown className={"w-3 h-3 text-slate-500 transition-transform "} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
            {years.map(y => (
              <button
                key={y.id}
                onClick={() => handleSelect(y.id)}
                className={"w-full text-left px-4 py-2 text-sm transition-colors "}
              >
                {y.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
