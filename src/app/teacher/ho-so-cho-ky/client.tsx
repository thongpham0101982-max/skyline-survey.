"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  PenTool,
  History,
  Download,
  Search,
  Filter,
  RefreshCw,
  Check,
  ChevronRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface DocumentItem {
  id: string;
  documentCode: string;
  formType: string;
  title: string;
  version: string;
  term: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  className: string;
  campusId?: string;
  academicYearId: string;
  academicYearName: string;
  subjectId?: string;
  contentHash: string;
  contentStatus: "DRAFT" | "NOT_ELIGIBLE" | "READY_TO_SIGN" | "REVISION_REQUIRED";
  publicationStatus: "UNPUBLISHED" | "PUBLISHED" | "SUPERSEDED";
  isCompleted: boolean;
  signerRole: "GVBM" | "GVCN";
  mySignatureStatus: string;
  latestSignature?: {
    status: string;
    signerRole: string;
    signerName: string;
    signedAt?: string;
    certificateSerial?: string;
    requestId?: string;
    signedPdfPath?: string;
  } | null;
  signaturesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  pending: number;
  signed: number;
  revisionRequired: number;
  failed: number;
  total: number;
}

export function TeacherHoSoChoKyClient() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    pending: 0,
    signed: 0,
    revisionRequired: 0,
    failed: 0,
    total: 0,
  });

  // Filter states
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFormType, setFilterFormType] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Preview & Sign Modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [signingDoc, setSigningDoc] = useState<DocumentItem | null>(null);
  const [signingStep, setSigningStep] = useState<"CONFIRM" | "OTP" | "DONE">("CONFIRM");
  const [otpCode, setOtpCode] = useState("");
  const [signingLoading, setSigningLoading] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Batch Sign Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);

  // Audit History Modal
  const [auditDoc, setAuditDoc] = useState<DocumentItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterFormType !== "ALL") params.set("formType", filterFormType);
      if (filterClass !== "ALL") params.set("classId", filterClass);

      const res = await fetch(`/api/teacher/digital-signature/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải danh sách hồ sơ");
      const data = await res.json();
      setDocuments(data.documents || []);
      setStats(
        data.stats || { pending: 0, signed: 0, revisionRequired: 0, failed: 0, total: 0 }
      );
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus, filterFormType, filterClass]);

  // Unique classes for filter dropdown
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((d) => {
      if (d.classId && d.className) map.set(d.classId, d.className);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [documents]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const eligible = documents.filter((d) => !d.isCompleted).map((d) => d.id);
      setSelectedIds(eligible);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Sign Single Document Flow
  const handleStartSign = (doc: DocumentItem) => {
    setSigningDoc(doc);
    setSigningStep("CONFIRM");
    setOtpCode("");
    setActiveRequestId(null);
  };

  const handleInitiateSingleSign = async () => {
    if (!signingDoc) return;
    try {
      setSigningLoading(true);
      const res = await fetch("/api/teacher/digital-signature/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: signingDoc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể khởi tạo phiên ký");

      setActiveRequestId(data.requestId);
      setSigningStep("OTP");
      toast.success("Đã khởi tạo yêu cầu ký số. Vui lòng xác thực mã OTP.");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khởi tạo ký số");
    } finally {
      setSigningLoading(false);
    }
  };

  const handleConfirmSingleSign = async () => {
    if (!activeRequestId) return;
    try {
      setSigningLoading(true);
      const res = await fetch("/api/teacher/digital-signature/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeRequestId,
          otpCode: otpCode || "123456",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || "Ký số thất bại");

      toast.success("Ký số thành công! Tài liệu đã được lưu trữ an toàn.");
      setSigningStep("DONE");
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xác thực chữ ký số");
    } finally {
      setSigningLoading(false);
    }
  };

  // Batch Sign Flow
  const handleStartBatchSign = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 hồ sơ để ký hàng loạt.");
      return;
    }
    setBatchModalOpen(true);
    setBatchResults(null);
  };

  const handleExecuteBatchSign = async () => {
    try {
      setBatchLoading(true);
      const res = await fetch("/api/teacher/digital-signature/batch-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: selectedIds,
          otpCode: "123456",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý ký hàng loạt");

      setBatchResults(data.results || []);

      if (data.totalFailed === 0) {
        toast.success(`Đã ký số thành công toàn bộ ${data.totalSuccess} hồ sơ!`);
        setSelectedIds([]);
      } else {
        toast.error(`Ký hoàn tất: ${data.totalSuccess} thành công, ${data.totalFailed} lỗi.`);
      }
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Lỗi ký hàng loạt");
    } finally {
      setBatchLoading(false);
    }
  };

  // Reconcile Transaction
  const handleReconcile = async (requestId: string) => {
    try {
      toast.loading("Đang đối soát giao dịch với nhà cung cấp...", { id: "rec" });
      const res = await fetch("/api/teacher/digital-signature/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      toast.dismiss("rec");
      if (!res.ok) throw new Error(data.error || "Đối soát không thành công");

      if (data.resolved) {
        toast.success(data.message || "Đối soát thành công!");
        fetchDocuments();
      } else {
        toast.error(data.message || "Giao dịch chưa được hoàn tất trên cổng nhà cung cấp.");
      }
    } catch (err: any) {
      toast.dismiss("rec");
      toast.error(err.message || "Lỗi đối soát");
    }
  };

  // Audit History Flow
  const handleOpenAuditHistory = async (doc: DocumentItem) => {
    setAuditDoc(doc);
    setAuditLogs([]);
    try {
      setAuditLoading(true);
      const res = await fetch(`/api/teacher/digital-signature/audit-history?documentId=${doc.id}`);
      if (!res.ok) throw new Error("Không thể tải lịch sử ký");
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải lịch sử");
    } finally {
      setAuditLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = (doc: DocumentItem) => {
    window.open(`/api/teacher/digital-signature/download-pdf?documentId=${doc.id}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Masthead Header - Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs border-l-4 border-[#003B3A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#00A19A] tracking-wider uppercase">
                Hệ thống Giáo dục Sky-Line
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Trung tâm Phê duyệt & Ký số
              </span>
            </div>
            <h1 className="text-xl font-black text-[#003B3A] tracking-tight">
              Hồ sơ học sinh chờ ký số
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách các phiếu đánh giá, nhận xét môn học và hồ sơ năng lực học sinh thuộc phạm vi phân công giảng dạy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDocuments()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip - Tabular Numerics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Chờ ký */}
        <div
          onClick={() => setFilterStatus("READY_TO_SIGN")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs transition-all ${
            filterStatus === "READY_TO_SIGN" ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Chờ ký số</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.pending}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">Hồ sơ sẵn sàng ký</div>
        </div>

        {/* Đã ký */}
        <div
          onClick={() => setFilterStatus("SIGNED")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs transition-all ${
            filterStatus === "SIGNED" ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Đã ký số</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.signed}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Đã lưu trữ PDF có chứng thư</div>
        </div>

        {/* Cần ký lại */}
        <div
          onClick={() => setFilterStatus("REVISION_REQUIRED")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs transition-all ${
            filterStatus === "REVISION_REQUIRED" ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Cần ký lại</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.revisionRequired}</div>
          <div className="text-[11px] text-sky-600 font-semibold mt-1">Nội dung có phiên bản mới</div>
        </div>

        {/* Ký lỗi */}
        <div
          onClick={() => setFilterStatus("FAILED")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs transition-all ${
            filterStatus === "FAILED" ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Ký lỗi / Cần đối soát</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.failed}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Cần thử lại hoặc đối soát</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchDocuments()}
              placeholder="Tìm theo Mã học sinh hoặc Họ tên học sinh..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
            />
          </div>

          {/* Filter Lớp */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full md:w-44 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
          >
            <option value="ALL">Tất cả lớp phụ trách</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filter Loại biểu mẫu */}
          <select
            value={filterFormType}
            onChange={(e) => setFilterFormType(e.target.value)}
            className="w-full md:w-52 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
          >
            <option value="ALL">Tất cả loại biểu mẫu</option>
            <option value="HO_SO_NANG_LUC">Hồ sơ năng lực học sinh</option>
            <option value="PHIEU_DANH_GIA_MON_HOC">Phiếu nhận xét môn học</option>
            <option value="PHIEU_DANH_GIA_MAM_NON">Phiếu phát triển mầm non</option>
            <option value="CAM_KET_HOC_TAP">Bản cam kết học tập</option>
          </select>

          {/* Reset Filters */}
          {(filterStatus !== "ALL" || filterFormType !== "ALL" || filterClass !== "ALL" || search) && (
            <button
              onClick={() => {
                setFilterStatus("ALL");
                setFilterFormType("ALL");
                setFilterClass("ALL");
                setSearch("");
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-2 py-1 shrink-0"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Floating Batch Action Strip */}
      {selectedIds.length > 0 && (
        <div className="bg-[#003B3A] text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#00A19A] flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </span>
            <div>
              <div className="text-xs font-bold">
                Đã chọn <span className="tabular-nums font-black text-teal-300">{selectedIds.length}</span> hồ sơ học sinh
              </div>
              <div className="text-[11px] text-teal-100">
                Sẵn sàng ký số hàng loạt theo phân công chuyên môn
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
            >
              Hủy chọn
            </button>
            <button
              onClick={handleStartBatchSign}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-[#003B3A] bg-teal-300 hover:bg-teal-200 transition-all shadow-md active:scale-95"
            >
              <PenTool className="w-3.5 h-3.5" />
              Ký các hồ sơ đã chọn
            </button>
          </div>
        </div>
      )}

      {/* Ledger Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 &&
                      selectedIds.length === documents.filter((d) => !d.isCompleted).length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
                  />
                </th>
                <th className="py-3 px-3">Học sinh & Lớp</th>
                <th className="py-3 px-3">Loại tài liệu</th>
                <th className="py-3 px-3">Kỳ & Phiên bản</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div className="text-xs font-semibold">Không tìm thấy hồ sơ nào phù hợp.</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Vui lòng thử điều chỉnh bộ lọc hoặc kiểm tra lại phân công chuyên môn.
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  const isSigned = doc.isCompleted;
                  const isRevision = doc.contentStatus === "REVISION_REQUIRED";
                  const hasFailed = doc.latestSignature?.status === "FAILED";

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-teal-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isSigned}
                          onChange={() => handleToggleSelect(doc.id)}
                          className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] disabled:opacity-30"
                        />
                      </td>

                      {/* Học sinh & Lớp */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{doc.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                          <span>{doc.studentCode}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">{doc.className}</span>
                        </div>
                      </td>

                      {/* Tên hồ sơ */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{doc.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] mt-0.5">
                          {doc.documentCode}
                        </div>
                      </td>

                      {/* Kỳ & Phiên bản */}
                      <td className="py-3 px-3 tabular-nums">
                        <div className="font-medium text-slate-700">{doc.term}</div>
                        <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                          v{doc.version}
                        </span>
                      </td>

                      {/* Vai trò ký */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#003B3A]/10 text-[#003B3A]">
                          {doc.signerRole}
                        </span>
                      </td>

                      {/* Trạng thái ba nhóm */}
                      <td className="py-3 px-3 space-y-1">
                        {/* 1. Trạng thái Ký số */}
                        {isSigned ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Đã ký số CA
                          </div>
                        ) : hasFailed ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-2.5 h-2.5" />
                            Ký lỗi
                          </div>
                        ) : isRevision ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Bản mới cần ký lại
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-2.5 h-2.5" />
                            Chờ ký
                          </div>
                        )}

                        {/* 2. Trạng thái Công bố */}
                        <div className="text-[10px] text-slate-400">
                          {doc.publicationStatus === "PUBLISHED" ? (
                            <span className="text-teal-600 font-semibold">• Đã công bố PHHS</span>
                          ) : (
                            <span>• Chưa công bố</span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Nút Xem trước */}
                          <button
                            title="Xem trước nội dung"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Nút Ký số (chỉ hiện khi chưa ký hoặc cần ký lại) */}
                          {!isSigned && (
                            <button
                              title="Ký số tài liệu này"
                              onClick={() => handleStartSign(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-all shadow-xs"
                            >
                              <PenTool className="w-3 h-3" />
                              Ký số
                            </button>
                          )}

                          {/* Nút Lịch sử ký */}
                          <button
                            title="Xem lịch sử ký & đối soát"
                            onClick={() => handleOpenAuditHistory(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Nút Tải PDF (chỉ hiện khi đã ký) */}
                          {isSigned && (
                            <button
                              title="Tải tệp PDF đã ký"
                              onClick={() => handleDownloadPdf(doc)}
                              className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-50 transition-all"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: XEM TRƯỚC TÀI LIỆU (Preview Modal) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-[#003B3A]">{previewDoc.title}</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {previewDoc.documentCode} (Phiên bản v{previewDoc.version})
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                <div>Học sinh: <b className="text-slate-900">{previewDoc.studentName}</b></div>
                <div>Mã HS: <b className="font-mono text-slate-900">{previewDoc.studentCode}</b></div>
                <div>Lớp: <b className="text-slate-900">{previewDoc.className}</b></div>
                <div>Năm học: <b className="text-slate-900">{previewDoc.academicYearName}</b></div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Mã băm dữ liệu cố định (SHA-256 Content Hash):
                </div>
                <div className="font-mono text-[11px] text-slate-700 break-all bg-slate-100 p-2 rounded border border-slate-200">
                  {previewDoc.contentHash}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Vị trí neo chữ ký trên biểu mẫu:
                </div>
                <div className="p-3 border rounded-xl border-dashed border-teal-300 bg-teal-50/40 text-center">
                  <div className="text-[10px] text-teal-800 font-bold uppercase mb-1">
                    VÙNG KÝ CỦA {previewDoc.signerRole}
                  </div>
                  <div className="text-xs text-slate-600">
                    Chữ ký số sẽ được tự động gắn kèm thông tin chứng thư số và hình dấu tại chân trang tài liệu.
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
              {!previewDoc.isCompleted && (
                <button
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    handleStartSign(doc);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A]"
                >
                  Tiến hành ký số
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KÝ SỐ MỘT HỒ SƠ (Sign Modal) */}
      {signingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm font-bold">Xác nhận ký số tài liệu</h3>
              </div>
              <button
                onClick={() => setSigningDoc(null)}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {signingStep === "CONFIRM" && (
                <>
                  <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-2">
                    <div>Tài liệu: <b className="text-slate-900">{signingDoc.title}</b></div>
                    <div>Học sinh: <b className="text-slate-900">{signingDoc.studentName}</b> ({signingDoc.studentCode})</div>
                    <div>Lớp: <b className="text-slate-900">{signingDoc.className}</b></div>
                    <div>Vai trò ký: <b className="text-[#00A19A]">{signingDoc.signerRole}</b></div>
                    <div>Phiên bản: <b className="font-mono text-slate-900">v{signingDoc.version}</b></div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-teal-50 p-3 rounded-xl border border-teal-200">
                    Bằng việc nhấn <b>Gửi yêu cầu ký</b>, hệ thống sẽ chốt cố định nội dung snapshot này và gửi mã băm dữ liệu tới nhà cung cấp chứng thư số đã cấu hình.
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setSigningDoc(null)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleInitiateSingleSign}
                      disabled={signingLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50"
                    >
                      {signingLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang khởi tạo...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" />
                          Gửi yêu cầu ký
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {signingStep === "OTP" && (
                <>
                  <div className="text-center py-2 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#00A19A] mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-black text-slate-900">Xác thực chứng thư số</div>
                    <p className="text-slate-500 text-[11px]">
                      Vui lòng nhập mã OTP xác nhận từ ứng dụng SmartCA hoặc nhập mã xác thực (Sandbox mặc định: bất kỳ trừ 000000):
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Nhập mã OTP (VD: 123456)"
                      className="w-full text-center text-lg font-mono tracking-widest border border-slate-300 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setSigningDoc(null)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleConfirmSingleSign}
                      disabled={signingLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50"
                    >
                      {signingLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang xác thực...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-300" />
                          Xác nhận ký số
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {signingStep === "DONE" && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-black text-slate-900">Ký số hoàn tất thành công!</div>
                  <p className="text-slate-500 text-[11px]">
                    Tài liệu đã được lưu trữ an toàn kèm chứng thư số và mã băm toàn vẹn.
                  </p>
                  <button
                    onClick={() => setSigningDoc(null)}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A]"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KÝ HÀNG LOẠT (Batch Sign Modal) */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-teal-300" />
                <h3 className="text-sm font-bold">Ký số hàng loạt ({selectedIds.length} hồ sơ)</h3>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {!batchResults ? (
                <>
                  <p className="text-slate-600">
                    Bạn đang chuẩn bị ký số cho <b>{selectedIds.length} hồ sơ học sinh</b> đã chọn. Hệ thống sẽ xử lý và theo dõi kết quả độc lập cho từng hồ sơ.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto space-y-1.5">
                    {selectedIds.map((id) => {
                      const d = documents.find((doc) => doc.id === id);
                      return (
                        <div key={id} className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-800 truncate">{d?.studentName}</span>
                          <span className="text-slate-500 font-mono">{d?.className}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setBatchModalOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleExecuteBatchSign}
                      disabled={batchLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50"
                    >
                      {batchLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang ký ({selectedIds.length} hồ sơ)...
                        </>
                      ) : (
                        "Xác nhận ký tất cả"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-800">Kết quả ký số chi tiết từng hồ sơ:</div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batchResults.map((r, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                          r.success ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{r.studentName}</div>
                          <div className="text-slate-500">{r.message}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            r.success ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"
                          }`}
                        >
                          {r.success ? "Thành công" : "Lỗi"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setBatchModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A]"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LỊCH SỬ KÝ & ĐỐI SOÁT (Audit History Modal) */}
      {auditDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-[#003B3A]">Lịch sử ký số & Đối soát</h3>
                <p className="text-[11px] text-slate-400 font-mono">{auditDoc.documentCode}</p>
              </div>
              <button
                onClick={() => setAuditDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3 text-xs">
              {auditLoading ? (
                <div className="text-center py-6 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
                  Đang tải nhật ký...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic">Chưa có nhật ký nào được ghi nhận.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-normal tabular-nums">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Thực hiện bởi: <b>{log.actorName}</b> ({log.actorRole})
                    </div>
                    {log.details && (
                      <div className="text-[10px] font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-100 mt-1 break-all">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setAuditDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
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
