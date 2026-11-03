"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Building2,
  PieChart as PieIcon,
  TrendingUp,
  FileSpreadsheet,
  Globe
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from "recharts";

const COLORS = ["#005856", "#00A19A", "#D97706", "#2563EB", "#7C3AED", "#10B981", "#EC4899", "#6B7280"];

export default function AlumniReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [campusId, setCampusId] = useState("all");
  const [graduationYear, setGraduationYear] = useState("all");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campusId, graduationYear });
      const res = await fetch(`/api/admin/alumni/analytics?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.data);
      }
    } catch (e) {
      console.error("Error loading analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [campusId, graduationYear]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#005856]" />
              Báo cáo & Phân tích Chuyên sâu Mạng lưới Alumni
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Hệ thống 8 biểu mẫu thống kê định lượng phục vụ công tác đối soát, kiểm định chất lượng và kết nối cựu học sinh
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap gap-3 items-center text-xs">
          <div className="font-semibold text-gray-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#005856]" />
            Bộ lọc báo cáo:
          </div>

          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="p-2 rounded-xl border border-gray-200 bg-gray-50"
          >
            <option value="all">Tất cả các cơ sở</option>
            <option value="CS1">CS1</option>
            <option value="CS2">CS2</option>
            <option value="CS3">CS3</option>
            <option value="CS4">CS4</option>
            <option value="CS5">CS5</option>
          </select>

          <select
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            className="p-2 rounded-xl border border-gray-200 bg-gray-50"
          >
            <option value="all">Tất cả niên khóa</option>
            <option value="2027">Năm 2027</option>
            <option value="2026">Năm 2026</option>
            <option value="2025">Năm 2025</option>
            <option value="2024">Năm 2024</option>
          </select>

          <div className="ml-auto text-gray-400 text-[11px] italic">
            * Thời điểm chốt số liệu: {new Date().toLocaleDateString("vi-VN")}
          </div>
        </div>

        {/* 8 Standard Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report 1 & 2: Tỷ lệ cập nhật theo khóa & cơ sở */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-sm text-gray-900 mb-1">
              1. Tỷ lệ Đã cập nhật theo Cơ sở
            </h3>
            <p className="text-xs text-gray-500 mb-4">So sánh số lượng hồ sơ đã tự khai thông tin trên tổng số hồ sơ</p>

            {loading ? (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
            ) : analytics?.byCampus && analytics.byCampus.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byCampus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="campusId" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Tổng hồ sơ" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="updated" name="Đã cập nhật" fill="#005856" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Chưa có số liệu</div>
            )}
          </div>

          {/* Report 3: Phân bố theo Niên khóa */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-sm text-gray-900 mb-1">
              2. Phân bố Hồ sơ theo Năm tốt nghiệp
            </h3>
            <p className="text-xs text-gray-500 mb-4">Số lượng cựu học sinh và số lượng đã xác minh theo từng năm</p>

            {loading ? (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
            ) : analytics?.byYear && analytics.byYear.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byYear}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Tổng HS tốt nghiệp" fill="#00A19A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="verified" name="Đã xác minh" fill="#D97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Chưa có số liệu</div>
            )}
          </div>

          {/* Report 4: Trạng thái Học tập / Làm việc */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-sm text-gray-900 mb-1">
              3. Cơ cấu Học tập & Nghề nghiệp Hiện tại
            </h3>
            <p className="text-xs text-gray-500 mb-4">Tỷ lệ cựu học sinh đang học ĐH, đi làm hoặc tự doanh</p>

            {loading ? (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
            ) : analytics?.byAcademicStatus && analytics.byAcademicStatus.length > 0 ? (
              <div className="h-60 w-full flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.byAcademicStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.byAcademicStatus.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Chưa có số liệu</div>
            )}
          </div>

          {/* Report 5: Phân bố Quốc gia */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-sm text-gray-900 mb-1">
              4. Phân bố Quốc gia Học tập & Sinh sống
            </h3>
            <p className="text-xs text-gray-500 mb-4">Thống kê du học quốc tế và sinh sống trong nước</p>

            {loading ? (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
            ) : analytics?.byCountry && analytics.byCountry.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byCountry} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="country" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">Chưa có số liệu</div>
            )}
          </div>
        </div>

        {/* Methodology & Definition Box */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-700">Quy chuẩn phương pháp tính toán:</div>
          <p>• Mẫu số tính tỷ lệ cập nhật: Tổng số hồ sơ cựu học sinh được kế thừa hợp lệ trong cơ sở dữ liệu.</p>
          <p>• Trạng thái xác minh: Dữ liệu tự khai chỉ được tính vào danh mục chính thức sau khi được Ban quản trị phê duyệt.</p>
          <p>• Bảo mật vị trí: Dữ liệu nơi sống chỉ thống kê cấp Quốc gia / Tỉnh thành, tuyệt đối không công khai tọa độ chính xác.</p>
        </div>
      </div>
    </div>
  );
}
