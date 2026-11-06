"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  Users,
  GraduationCap,
  Briefcase,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  ClipboardCheck
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
  CartesianGrid
} from "recharts";

const COLORS = ["#005856", "#00A19A", "#D97706", "#2563EB", "#003B3A", "#10B981", "#EC4899", "#6B7280"];

export default function AlumniOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alumni/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Error fetching alumni analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Quick Welcome & Action Banner */}
        <div className="bg-gradient-to-r from-[#005856] via-[#00706d] to-[#00A19A] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Mạng lưới Cựu học sinh Sky-Line
            </h2>
            <p className="mt-2 text-sm sm:text-base text-teal-100 leading-relaxed">
              Theo dõi và hỗ trợ hành trình học tập đại học, cao học và phát triển sự nghiệp của học sinh sau khi tốt nghiệp.
              Tích hợp trực tiếp với Hồ sơ học sinh hiện hữu của SSM.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/alumni/danh-sach"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#005856] font-semibold text-xs sm:text-sm hover:bg-teal-50 transition-all shadow-sm"
              >
                <Users className="w-4 h-4" />
                Kế thừa & Danh sách HS
              </Link>
              <Link
                href="/admin/alumni/tiep-nhan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm"
              >
                <Clock className="w-4 h-4" />
                Kiểm duyệt đơn cập nhật
                {data?.pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-white text-amber-700 font-bold rounded-full">
                    {data.pendingCount}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/alumni/ma-qr"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800/80 hover:bg-teal-900 text-white font-medium text-xs sm:text-sm transition-all border border-teal-400/30"
              >
                <QrCode className="w-4 h-4" />
                Quản lý mã QR
              </Link>
            </div>
          </div>
          {/* Subtle Decorative Background Circles */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-32 top-0 -translate-y-12 w-48 h-48 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Metric 1 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số hồ sơ</span>
              <div className="p-2.5 rounded-xl bg-teal-50 text-[#005856]">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {loading ? "..." : (data?.total || 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Cựu học sinh trên toàn hệ thống</p>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tỷ lệ đã cập nhật</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                {loading ? "..." : `${data?.updateRate || 0}%`}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {data?.updatedCount || 0} hồ sơ đã tự khai thông tin
              </p>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Đã xác minh</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {loading ? "..." : (data?.verifiedCount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Đã được nhà trường duyệt chuẩn</p>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chờ xác minh</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {loading ? "..." : (data?.pendingCount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Yêu cầu cập nhật mới từ HS</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Phân bố theo Trường Đại học */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Phân bố Trường Đại học / Cơ sở đào tạo</h3>
                <p className="text-xs text-gray-500">Top các trường đại học cựu học sinh đang theo học</p>
              </div>
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Đang tải biểu đồ...</div>
            ) : data?.topUniversities && data.topUniversities.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topUniversities} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="institutionName" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#005856" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-xl">
                <GraduationCap className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">Chưa có dữ liệu trường đại học</p>
                <p className="text-xs text-gray-400 mt-1">Dữ liệu sẽ hiển thị khi cựu học sinh cập nhật thông tin qua QR</p>
              </div>
            )}
          </div>

          {/* Chart 2: Phân bố Quốc gia & Khu vực */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Quốc gia Du học & Sinh sống</h3>
                <p className="text-xs text-gray-500">Tỷ lệ phân bố cựu học sinh trong nước và quốc tế</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-gray-400" />
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Đang tải biểu đồ...</div>
            ) : data?.byCountry && data.byCountry.length > 0 ? (
              <div className="h-64 w-full flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byCountry}
                      dataKey="count"
                      nameKey="country"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.byCountry.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-xl">
                <Building2 className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">Chưa có dữ liệu quốc gia</p>
                <p className="text-xs text-gray-400 mt-1">Hệ thống sẽ cập nhật khi có hồ sơ khai báo nơi sống</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/alumni/danh-sach"
            className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#005856] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#005856] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#005856] transition-colors">
                Kế thừa & Quản lý Danh sách
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Tự động lọc học sinh đủ điều kiện tốt nghiệp Khối 12/9/5 từ SSM, chuyển đổi hồ sơ có chống trùng và cấp QR.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-[#005856]">
              Xem danh sách <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/alumni/ma-qr"
            className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#005856] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#005856] transition-colors">
                Cấp & In Thẻ QR Cá nhân
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Quản lý vòng đời mã QR bảo mật: cấp mới, tải ảnh chất lượng cao để in thẻ Alumni, thu hồi hoặc cấp lại khi cần.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-[#005856]">
              Quản lý mã QR <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/alumni/tiep-nhan"
            className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#005856] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#005856] transition-colors">
                Tiếp nhận & Kiểm duyệt
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Quy trình xác minh dữ liệu tự khai từ cựu học sinh. So sánh đối chiếu trước sau, duyệt hoặc gửi phản hồi bổ sung.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-[#005856]">
              Xem hàng đợi duyệt <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
