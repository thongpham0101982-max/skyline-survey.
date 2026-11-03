"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  Users,
  Search,
  Filter,
  Download,
  PlusCircle,
  Eye,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  RefreshCw
} from "lucide-react";

export default function AlumniListPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [campusId, setCampusId] = useState("all");
  const [graduationYear, setGraduationYear] = useState("all");
  const [graduationGrade, setGraduationGrade] = useState("all");
  const [verificationStatus, setVerificationStatus] = useState("all");

  // Modals
  const [showInheritModal, setShowInheritModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState<any>(null);

  // Inherit Modal State
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [inheritGrade, setInheritGrade] = useState("12");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [inheriting, setInheriting] = useState(false);
  const [inheritResult, setInheritResult] = useState<any>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
        campusId,
        graduationYear,
        graduationGrade,
        verificationStatus
      });
      const res = await fetch(`/api/admin/alumni/profiles?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages || 1);
      }
    } catch (e) {
      console.error("Error fetching profiles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [page, campusId, graduationYear, graduationGrade, verificationStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProfiles();
  };

  // Preview eligible graduates for modal
  const loadEligibleGraduates = async (gradeVal = inheritGrade) => {
    setLoadingPreview(true);
    setInheritResult(null);
    try {
      const res = await fetch(`/api/admin/alumni/inherit?grade=${gradeVal}`);
      const json = await res.json();
      if (json.success) {
        setPreviewStudents(json.data);
        // Select all eligible (not yet alumni) by default
        const eligible = json.data.filter((s: any) => !s.isAlreadyAlumni).map((s: any) => s.studentId);
        setSelectedStudentIds(eligible);
      }
    } catch (e) {
      console.error("Error loading eligible graduates:", e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenInheritModal = () => {
    setShowInheritModal(true);
    loadEligibleGraduates(inheritGrade);
  };

  const handleExecuteInherit = async () => {
    if (selectedStudentIds.length === 0) return;
    setInheriting(true);
    try {
      const res = await fetch("/api/admin/alumni/inherit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: inheritGrade,
          studentIds: selectedStudentIds
        })
      });
      const json = await res.json();
      if (json.success) {
        setInheritResult(json);
        fetchProfiles();
        loadEligibleGraduates(inheritGrade);
      } else {
        alert(json.error || "Lỗi kế thừa hồ sơ");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setInheriting(false);
    }
  };

  const handleViewQr = async (profile: any) => {
    try {
      const res = await fetch("/api/admin/alumni/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GET_OR_CREATE",
          alumniId: profile.id
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowQrModal({
          profile,
          qrInfo: json.data
        });
      }
    } catch (e) {
      console.error("Error getting QR:", e);
    }
  };

  const handleViewDetail = async (profileId: string) => {
    try {
      const res = await fetch(`/api/admin/alumni/profiles/${profileId}`);
      const json = await res.json();
      if (json.success) {
        setShowDetailModal(json.data);
      }
    } catch (e) {
      console.error("Error fetching detail:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#005856]" />
              Danh sách Cựu học sinh Sky-Line
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tổng số <span className="font-semibold text-gray-800">{total}</span> hồ sơ cựu học sinh đã lưu trong hệ thống
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenInheritModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#005856] to-[#00A19A] text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Kế thừa học sinh tốt nghiệp
            </button>
            <button
              onClick={fetchProfiles}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Tên, Mã học sinh, Email, Đơn vị công tác..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856] focus:ring-1 focus:ring-[#005856]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#005856] text-white text-xs sm:text-sm font-medium hover:bg-teal-900 transition-colors"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Campus filter */}
            <div>
              <label className="block text-gray-500 font-medium mb-1">Cơ sở tốt nghiệp</label>
              <select
                value={campusId}
                onChange={(e) => { setCampusId(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-800"
              >
                <option value="all">Tất cả cơ sở</option>
                <option value="CS1">CS1 - Riverside</option>
                <option value="CS2">CS2 - Central</option>
                <option value="CS3">CS3 - Hill</option>
                <option value="CS4">CS4 - Beach</option>
                <option value="CS5">CS5 - International</option>
              </select>
            </div>

            {/* Year filter */}
            <div>
              <label className="block text-gray-500 font-medium mb-1">Năm tốt nghiệp</label>
              <select
                value={graduationYear}
                onChange={(e) => { setGraduationYear(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-800"
              >
                <option value="all">Tất cả các năm</option>
                <option value="2027">2027</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            {/* Grade filter */}
            <div>
              <label className="block text-gray-500 font-medium mb-1">Cấp / Khối tốt nghiệp</label>
              <select
                value={graduationGrade}
                onChange={(e) => { setGraduationGrade(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-800"
              >
                <option value="all">Tất cả cấp học</option>
                <option value="12">Khối 12 (THPT)</option>
                <option value="9">Khối 9 (THCS)</option>
                <option value="5">Khối 5 (Tiểu học)</option>
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-gray-500 font-medium mb-1">Trạng thái xác minh</label>
              <select
                value={verificationStatus}
                onChange={(e) => { setVerificationStatus(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-800"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="VERIFIED">Đã xác minh</option>
                <option value="PENDING_REVIEW">Chờ xác minh</option>
                <option value="UNVERIFIED">Chưa cập nhật</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Họ và tên</th>
                  <th className="py-3.5 px-3">Mã học sinh</th>
                  <th className="py-3.5 px-3">Cơ sở / Khóa</th>
                  <th className="py-3.5 px-3">Học tập / Nghề nghiệp hiện tại</th>
                  <th className="py-3.5 px-3">Nơi sống</th>
                  <th className="py-3.5 px-3 text-center">Xác minh</th>
                  <th className="py-3.5 px-3 text-center">Mã QR</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Đang tải danh sách hồ sơ...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Không tìm thấy hồ sơ cựu học sinh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{p.studentName}</div>
                        {p.englishName && <div className="text-xs text-gray-400 font-normal">{p.englishName}</div>}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-gray-700">
                        {p.studentCode}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-gray-800">{p.campusId}</span>
                        <div className="text-[11px] text-gray-500">Khối {p.graduationGrade} • {p.graduationYear}</div>
                      </td>
                      <td className="py-3 px-3">
                        {p.currentEmployer || p.currentJobTitle ? (
                          <div>
                            <span className="font-medium text-gray-900">{p.currentJobTitle || "Nhân sự"}</span>
                            {p.currentEmployer && <div className="text-[11px] text-gray-500">tại {p.currentEmployer}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa khai báo</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        {p.currentResidenceCity ? `${p.currentResidenceCity}, ` : ""}{p.currentResidenceCountry || "Việt Nam"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {p.verificationStatus === "VERIFIED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Đã duyệt
                          </span>
                        ) : p.verificationStatus === "PENDING_REVIEW" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            Chờ duyệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                            Chưa cập nhật
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleViewQr(p)}
                          className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-50 border border-teal-200/80 transition-colors"
                          title="Xem & Tải mã QR cá nhân"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleViewDetail(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div>
                Trang <span className="font-semibold">{page}</span> / {totalPages} (Tổng {total} bản ghi)
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Kế thừa học sinh tốt nghiệp */}
      {showInheritModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#005856] to-[#00A19A] text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-300" />
                  Kế thừa Hồ sơ Học sinh Tốt nghiệp sang Alumni
                </h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  Tự động kế thừa thông tin từ SSM gốc, giữ nguyên hồ sơ và cấp mã QR cá nhân
                </p>
              </div>
              <button
                onClick={() => setShowInheritModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Select Grade Tabs */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <span className="font-medium text-gray-700">Chọn khối tốt nghiệp xét duyệt:</span>
                <div className="flex gap-2">
                  {[
                    { id: "12", label: "Khối 12 (THPT)" },
                    { id: "9", label: "Khối 9 (THCS)" },
                    { id: "5", label: "Khối 5 (Tiểu học)" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setInheritGrade(g.id); loadEligibleGraduates(g.id); }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        inheritGrade === g.id
                          ? "bg-[#005856] text-white shadow-xs"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status / Result Notice */}
              {inheritResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Kế thừa thành công!
                  </div>
                  <p>{inheritResult.message}</p>
                </div>
              )}

              {/* Student Selection List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs">
                  <div className="font-semibold text-gray-700">
                    Danh sách học sinh đủ điều kiện ({previewStudents.length} học sinh)
                  </div>
                  <div className="text-gray-500">
                    Đã chọn: <span className="font-bold text-[#005856]">{selectedStudentIds.length}</span>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {loadingPreview ? (
                    <div className="p-8 text-center text-gray-400">Đang quét danh sách học sinh...</div>
                  ) : previewStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Không tìm thấy học sinh nào trong khối này.</div>
                  ) : (
                    previewStudents.map((st) => (
                      <div
                        key={st.studentId}
                        className={`p-3 flex items-center justify-between ${
                          st.isAlreadyAlumni ? "bg-gray-50/60 opacity-60" : "hover:bg-teal-50/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={st.isAlreadyAlumni}
                            checked={selectedStudentIds.includes(st.studentId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, st.studentId]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.studentId));
                              }
                            }}
                            className="rounded text-[#005856] focus:ring-[#005856]"
                          />
                          <div>
                            <div className="font-bold text-gray-900">{st.studentName}</div>
                            <div className="text-[11px] text-gray-500">
                              Mã HS: <span className="font-mono">{st.studentCode}</span> • Lớp: {st.className} ({st.campusId})
                            </div>
                          </div>
                        </div>

                        <div>
                          {st.isAlreadyAlumni ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-700">
                              Đã có hồ sơ Alumni
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                              Sẵn sàng kế thừa
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500 italic">
                * Thao tác đảm bảo Idempotent, không gây trùng lặp và không sửa đổi hồ sơ gốc.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInheritModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Đóng
                </button>
                <button
                  disabled={inheriting || selectedStudentIds.length === 0}
                  onClick={handleExecuteInherit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#005856] to-[#00A19A] text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-40"
                >
                  {inheriting ? "Đang xử lý..." : `Kế thừa (${selectedStudentIds.length}) hồ sơ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem & Tải Mã QR */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <h3 className="font-bold text-base text-gray-900 mb-1">Mã QR Cựu học sinh</h3>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              {showQrModal.profile.studentName} ({showQrModal.profile.studentCode})
            </p>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex justify-center mb-4">
              <img
                src={showQrModal.qrInfo.qrDataUrl}
                alt="Alumni QR Code"
                className="w-56 h-56 rounded-xl shadow-xs"
              />
            </div>

            <div className="text-[11px] text-gray-500 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100 mb-4 text-left">
              <div><span className="font-semibold text-[#005856]">Vòng đời:</span> Đang hoạt động (ACTIVE)</div>
              <div><span className="font-semibold text-[#005856]">Số lượt quét:</span> {showQrModal.qrInfo.scanCount} lượt</div>
              <div className="truncate"><span className="font-semibold text-[#005856]">Liên kết:</span> {showQrModal.qrInfo.portalUrl}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowQrModal(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
              >
                Đóng
              </button>
              <a
                href={showQrModal.qrInfo.qrDataUrl}
                download={`QR_Alumni_${showQrModal.profile.studentCode}.png`}
                className="flex-1 py-2 rounded-xl bg-[#005856] text-white text-xs font-semibold hover:bg-teal-900 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Tải ảnh QR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chi tiết Hồ sơ Alumni */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-base text-gray-900">{showDetailModal.studentName}</h3>
                <p className="text-xs text-gray-500">
                  Mã HS: <span className="font-mono font-medium">{showDetailModal.studentCode}</span> • Cơ sở {showDetailModal.campusId} • Tốt nghiệp năm {showDetailModal.graduationYear}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Personal Contact */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider text-teal-800 mb-2">
                  1. Thông tin liên hệ & Cư trú
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Email cá nhân</span>
                    <span className="font-medium text-gray-800">{showDetailModal.personalEmail || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Số điện thoại</span>
                    <span className="font-medium text-gray-800">{showDetailModal.personalPhone || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Quốc gia sinh sống</span>
                    <span className="font-medium text-gray-800">{showDetailModal.currentResidenceCountry || "Việt Nam"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Thành phố</span>
                    <span className="font-medium text-gray-800">{showDetailModal.currentResidenceCity || "Chưa cập nhật"}</span>
                  </div>
                </div>
              </div>

              {/* Education Journey */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider text-teal-800 mb-2">
                  2. Hành trình Học tập Đại học / Sau ĐH ({showDetailModal.educations?.length || 0})
                </h4>
                {showDetailModal.educations && showDetailModal.educations.length > 0 ? (
                  <div className="space-y-2">
                    {showDetailModal.educations.map((edu: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="font-bold text-gray-900">{edu.institutionName}</div>
                        <div className="text-gray-600 text-xs">
                          {edu.degreeLevel}: {edu.majorName} {edu.specialization ? `(${edu.specialization})` : ""}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Năm học: {edu.startYear} - {edu.endYear || "Hiện tại"} • {edu.country}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic bg-gray-50 p-3 rounded-xl">Chưa có bản ghi học tập nào.</p>
                )}
              </div>

              {/* Career Journey */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider text-teal-800 mb-2">
                  3. Hành trình Nghề nghiệp & Công tác ({showDetailModal.careers?.length || 0})
                </h4>
                {showDetailModal.careers && showDetailModal.careers.length > 0 ? (
                  <div className="space-y-2">
                    {showDetailModal.careers.map((car: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="font-bold text-gray-900">{car.jobTitle}</div>
                        <div className="text-gray-600 text-xs">{car.organization || "Đơn vị tự do"} • Ngành: {car.industry}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Quốc gia làm việc: {car.workCountry}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic bg-gray-50 p-3 rounded-xl">Chưa có bản ghi nghề nghiệp nào.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-5 py-2 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
