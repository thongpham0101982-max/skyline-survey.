"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  Building2,
  GraduationCap,
  Briefcase,
  MapPin,
  Check,
  X
} from "lucide-react";

export default function AlumniSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, search });
      const res = await fetch(`/api/admin/alumni/submissions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data);
      }
    } catch (e) {
      console.error("Error fetching submissions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [status]);

  const handleReview = async (subId: string, action: "APPROVE" | "REJECT" | "NEEDS_INFO") => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/alumni/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: subId,
          action,
          reviewNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedSub(null);
        setReviewNotes("");
        fetchSubmissions();
      } else {
        alert(json.error || "Lỗi xử lý yêu cầu");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#005856]" />
              Tiếp nhận & Kiểm duyệt Dữ liệu Cập nhật
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Quy trình đối soát, xác minh thông tin tự khai từ cựu học sinh trước khi đưa vào hồ sơ chính thức
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSubmissions}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {[
              { id: "PENDING", label: "Chờ xác minh", countTag: true },
              { id: "APPROVED", label: "Đã phê duyệt" },
              { id: "NEEDS_INFO", label: "Yêu cầu bổ sung" },
              { id: "REJECTED", label: "Đã từ chối" },
              { id: "all", label: "Tất cả đơn" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  status === tab.id
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
              placeholder="Tìm theo Mã đơn, Họ tên, Mã học sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSubmissions()}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
            />
          </div>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              Đang tải danh sách yêu cầu...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              Không có yêu cầu cập nhật nào ở trạng thái này.
            </div>
          ) : (
            submissions.map((sub) => {
              const p = sub.submittedData;
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-[#005856] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-gray-900">{sub.studentName}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {sub.studentCode}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({sub.campusId} • Niên khóa {sub.graduationYear})
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Mã đơn: <strong className="font-mono text-gray-600">{sub.submissionCode}</strong> • Ngày gửi:{" "}
                        {new Date(sub.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {sub.status === "PENDING" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Chờ xác minh
                        </span>
                      )}
                      {sub.status === "APPROVED" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
                        </span>
                      )}
                      {sub.status === "REJECTED" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSub(sub);
                          setReviewNotes(sub.reviewNotes || "");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#005856] text-white text-xs font-semibold hover:bg-teal-900 transition-colors"
                      >
                        Kiểm duyệt & Đối soát
                      </button>
                    </div>
                  </div>

                  {/* Summary of submitted data */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#005856]" />
                        Học tập khai báo:
                      </div>
                      {p.educations && p.educations.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900">{p.educations[0].institutionName}</div>
                          <div className="text-gray-600">{p.educations[0].majorName}</div>
                          <div className="text-[11px] text-gray-400">{p.educations[0].country}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Không cập nhật</span>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-[#005856]" />
                        Nghề nghiệp khai báo:
                      </div>
                      {p.careers && p.careers.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900">{p.careers[0].jobTitle}</div>
                          <div className="text-gray-600">{p.careers[0].organization || "Doanh nghiệp"}</div>
                          <div className="text-[11px] text-gray-400">{p.careers[0].industry}</div>
                        </div>
                      ) : p.currentJobTitle ? (
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900">{p.currentJobTitle}</div>
                          <div className="text-gray-600">{p.currentEmployer}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Không cập nhật</span>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#005856]" />
                        Nơi sống & Liên hệ:
                      </div>
                      <div className="space-y-1 text-gray-700">
                        <div>
                          {p.currentResidenceCity ? `${p.currentResidenceCity}, ` : ""}
                          {p.currentResidenceCountry || "Việt Nam"}
                        </div>
                        {p.personalEmail && <div>Email: {p.personalEmail}</div>}
                        {p.personalPhone && <div>SĐT: {p.personalPhone}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Review Modal: Đối soát Chi tiết và Phê duyệt */}
      {selectedSub && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#005856] to-[#00A19A] text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-amber-300" />
                  Đối soát & Phê duyệt Đơn Cập nhật: {selectedSub.submissionCode}
                </h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  Cựu học sinh: {selectedSub.studentName} ({selectedSub.studentCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-500 block mb-3">
                    Dữ liệu hiện tại trong hồ sơ
                  </span>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div>
                      <span className="text-gray-500">Email:</span> {selectedSub.currentInfo.personalEmail || "Chưa có"}
                    </div>
                    <div>
                      <span className="text-gray-500">Số điện thoại:</span> {selectedSub.currentInfo.personalPhone || "Chưa có"}
                    </div>
                    <div>
                      <span className="text-gray-500">Chức danh:</span> {selectedSub.currentInfo.currentJobTitle || "Chưa có"}
                    </div>
                    <div>
                      <span className="text-gray-500">Đơn vị:</span> {selectedSub.currentInfo.currentEmployer || "Chưa có"}
                    </div>
                  </div>
                </div>

                {/* After (Submitted) */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#005856] block mb-3">
                    Dữ liệu tự khai mới gửi lên
                  </span>
                  <div className="space-y-2 text-xs text-gray-800">
                    <div>
                      <span className="text-teal-700 font-medium">Email:</span> {selectedSub.submittedData.personalEmail || "Không đổi"}
                    </div>
                    <div>
                      <span className="text-teal-700 font-medium">Số điện thoại:</span> {selectedSub.submittedData.personalPhone || "Không đổi"}
                    </div>
                    <div>
                      <span className="text-teal-700 font-medium">Nơi sống:</span> {selectedSub.submittedData.currentResidenceCity}, {selectedSub.submittedData.currentResidenceCountry || "Việt Nam"}
                    </div>
                    <div>
                      <span className="text-teal-700 font-medium">Đơn vị / Chức danh:</span> {selectedSub.submittedData.currentEmployer} ({selectedSub.submittedData.currentJobTitle})
                    </div>
                  </div>
                </div>
              </div>

              {/* Education Submissions */}
              {selectedSub.submittedData.educations && selectedSub.submittedData.educations.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2">
                    Quá trình đào tạo tự khai:
                  </h4>
                  <div className="space-y-2">
                    {selectedSub.submittedData.educations.map((edu: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white text-xs">
                        <div className="font-bold text-gray-900">{edu.institutionName}</div>
                        <div className="text-gray-600">
                          {edu.degreeLevel}: {edu.majorName} {edu.specialization ? `(${edu.specialization})` : ""}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Năm: {edu.startYear} - {edu.endYear || "Hiện tại"} • {edu.country}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Submissions */}
              {selectedSub.submittedData.careers && selectedSub.submittedData.careers.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2">
                    Quá trình công tác tự khai:
                  </h4>
                  <div className="space-y-2">
                    {selectedSub.submittedData.careers.map((car: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white text-xs">
                        <div className="font-bold text-gray-900">{car.jobTitle}</div>
                        <div className="text-gray-600">{car.organization} • {car.industry}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Quốc gia: {car.workCountry}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Note Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ghi chú của người kiểm duyệt:
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ghi chú xác minh, căn cứ hoặc lý do yêu cầu bổ sung/từ chối..."
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium"
              >
                Đóng
              </button>

              <div className="flex gap-2">
                <button
                  disabled={processing}
                  onClick={() => handleReview(selectedSub.id, "REJECT")}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                >
                  Từ chối
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleReview(selectedSub.id, "NEEDS_INFO")}
                  className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
                >
                  Yêu cầu bổ sung
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleReview(selectedSub.id, "APPROVE")}
                  className="px-5 py-2 rounded-xl bg-[#005856] text-white hover:bg-teal-900 font-semibold shadow-sm"
                >
                  {processing ? "Đang xử lý..." : "Duyệt cập nhật vào Hồ sơ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
