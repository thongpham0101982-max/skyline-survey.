"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  Compass,
  GraduationCap,
  Briefcase,
  Search,
  Building2,
  MapPin,
  Calendar,
  Globe,
  Award,
  RefreshCw
} from "lucide-react";

export default function AlumniJourneyPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "STUDYING" | "WORKING">("ALL");

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "50" });
      const res = await fetch(`/api/admin/alumni/profiles?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
      }
    } catch (e) {
      console.error("Error fetching alumni journey:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filtered = profiles.filter((p) => {
    if (filterType === "STUDYING") return p.currentAcademicStatus === "STUDYING";
    if (filterType === "WORKING") return p.currentCareerStatus === "WORKING" || Boolean(p.currentEmployer);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#005856]" />
              Hành trình Học tập & Nghề nghiệp Cựu học sinh
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi bước đường đại học, học bổng và vị trí công tác của các thế hệ học sinh Sky-Line
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProfiles}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2">
            {[
              { id: "ALL", label: "Tất cả hành trình" },
              { id: "STUDYING", label: "Đang học Đại học" },
              { id: "WORKING", label: "Đang đi làm / Lập nghiệp" },
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterType === tab.id
                    ? "bg-[#005856] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, trường đại học, chức danh, doanh nghiệp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProfiles()}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
            />
          </div>
        </div>

        {/* Journey Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              Đang tải hành trình cựu học sinh...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              Chưa có dữ liệu hành trình phù hợp.
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-[#005856] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{p.studentName}</h3>
                      <span className="text-xs text-gray-500">
                        {p.campusId} • Niên khóa {p.graduationYear} (Khối {p.graduationGrade})
                      </span>
                    </div>
                    <span className="p-2 rounded-xl bg-teal-50 text-[#005856]">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2.5 text-xs text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span>{p.currentResidenceCity ? `${p.currentResidenceCity}, ` : ""}{p.currentResidenceCountry || "Việt Nam"}</span>
                    </div>

                    {p.currentEmployer || p.currentJobTitle ? (
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-4 h-4 text-[#005856] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-gray-900">{p.currentJobTitle || "Chức danh"}</strong>
                          {p.currentEmployer && <div className="text-gray-500">tại {p.currentEmployer}</div>}
                        </div>
                      </div>
                    ) : null}

                    {p.personalEmail && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span>Email: {p.personalEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    {p.lastSelfUpdatedAt
                      ? `Cập nhật: ${new Date(p.lastSelfUpdatedAt).toLocaleDateString("vi-VN")}`
                      : "Dữ liệu kế thừa gốc"}
                  </span>
                  <span className="font-semibold text-teal-800">
                    {p.verificationStatus === "VERIFIED" ? "✓ Đã xác minh" : "Chờ cập nhật"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
