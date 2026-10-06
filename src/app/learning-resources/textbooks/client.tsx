"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  RefreshCw,
  Building2,
  ShieldCheck,
  UserCheck,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UploadTextbookModal } from "@/components/textbooks/UploadTextbookModal";
import { PdfReaderModal } from "@/components/textbooks/PdfReaderModal";
import { TextbookStructureDrawer } from "@/components/textbooks/TextbookStructureDrawer";
import { TextbookAskAiDrawer } from "@/components/textbooks/TextbookAskAiDrawer";
import toast from "react-hot-toast";

interface TextbookLibraryClientProps {
  user: any;
  isAdmin: boolean;
  initialSubjects: any[];
  initialSeries: any[];
  initialPublishers: any[];
  initialAcademicYears: any[];
}

export function TextbookLibraryClient({
  user,
  isAdmin,
  initialSubjects,
  initialSeries,
  initialPublishers,
  initialAcademicYears
}: TextbookLibraryClientProps) {
  // Tabs: "all" | "my-books" | "categories" | "sources"
  const [activeTab, setActiveTab] = useState<"all" | "my-books" | "categories" | "sources">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [grade, setGrade] = useState("ALL");
  const [subjectId, setSubjectId] = useState("ALL");
  const [seriesId, setSeriesId] = useState("ALL");
  const [publisherId, setPublisherId] = useState("ALL");
  const [processingStatus, setProcessingStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // Data
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [readerModalOpen, setReaderModalOpen] = useState(false);
  const [structureDrawerOpen, setStructureDrawerOpen] = useState(false);
  const [askAiDrawerOpen, setAskAiDrawerOpen] = useState(false);

  // Selected item
  const [selectedTextbook, setSelectedTextbook] = useState<any | null>(null);
  const [targetPage, setTargetPage] = useState<number>(1);

  // Fetch all textbooks
  const fetchTextbooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (grade !== "ALL") params.append("grade", grade);
      if (subjectId !== "ALL") params.append("subjectId", subjectId);
      if (seriesId !== "ALL") params.append("seriesId", seriesId);
      if (publisherId !== "ALL") params.append("publisherId", publisherId);
      if (processingStatus !== "ALL") params.append("processingStatus", processingStatus);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/learning-resources/textbooks?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTextbooks(data.data);
      }
    } catch (e) {
      console.error("Error fetching textbooks:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch teacher's my textbooks
  const fetchMyTextbooks = async () => {
    try {
      const res = await fetch("/api/learning-resources/my-textbooks");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMyBooks(data.data);
      }
    } catch (e) {
      console.error("Error fetching my textbooks:", e);
    }
  };

  // Fetch sources
  const fetchSources = async () => {
    try {
      const res = await fetch("/api/learning-resources/sources");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSources(data.data);
      }
    } catch (e) {
      console.error("Error fetching sources:", e);
    }
  };

  useEffect(() => {
    fetchTextbooks();
    fetchMyTextbooks();
    if (isAdmin) fetchSources();
  }, [grade, subjectId, seriesId, publisherId, processingStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTextbooks();
  };

  const handleOpenReader = (book: any, page = 1) => {
    setSelectedTextbook(book);
    setTargetPage(page);
    setReaderModalOpen(true);
  };

  const handleOpenStructure = (book: any) => {
    setSelectedTextbook(book);
    setStructureDrawerOpen(true);
  };

  const handleOpenAskAi = (book: any) => {
    setSelectedTextbook(book);
    setAskAiDrawerOpen(true);
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Thầy/Cô có chắc chắn muốn xóa sách '${title}' khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/learning-resources/textbooks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Đã xóa sách giáo khoa thành công.");
        fetchTextbooks();
        fetchMyTextbooks();
      } else {
        toast.error(data.error || "Không thể xóa sách.");
      }
    } catch (e: any) {
      toast.error("Lỗi khi xóa: " + e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Đã xuất bản (READY)</Badge>;
      case "REVIEW_REQUIRED":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-300">Cần duyệt (REVIEW)</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Đang xử lý (PROCESSING)</Badge>;
      case "OCR_REQUIRED":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Cần OCR (OCR_REQUIRED)</Badge>;
      case "NEW":
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Mới tạo (NEW)</Badge>;
      case "ERROR":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Lỗi (ERROR)</Badge>;
      case "ARCHIVED":
        return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">Lưu trữ (ARCHIVED)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const displayedBooks = activeTab === "my-books" ? myBooks : textbooks;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A19A] to-[#005854] text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Thư viện Sách giáo khoa số
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                SSM Core
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kho học liệu SGK chuẩn hóa phục vụ Giảng dạy, Dự giờ, Cố vấn và Hỗ trợ học tập
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-[#00A19A] hover:bg-[#008B85] text-white font-medium text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm Sách giáo khoa
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "all"
              ? "border-[#00A19A] text-[#00A19A]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Kho Sách giáo khoa ({textbooks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my-books")}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "my-books"
              ? "border-[#00A19A] text-[#00A19A]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          Học liệu của tôi ({myBooks.length})
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "categories"
                  ? "border-[#00A19A] text-[#00A19A]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Bộ sách & NXB
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sources")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "sources"
                  ? "border-[#00A19A] text-[#00A19A]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Nguồn Whitelist ({sources.length})
            </button>
          </>
        )}
      </div>

      {/* Main Tab Content */}
      {(activeTab === "all" || activeTab === "my-books") && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
              {/* Khối lớp */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Khối lớp</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả Khối</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={String(g)}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Môn học */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả Môn học</option>
                  {initialSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bộ sách */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bộ sách</label>
                <select
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả Bộ sách</option>
                  {initialSeries.map((ser) => (
                    <option key={ser.id} value={ser.id}>
                      {ser.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhà xuất bản */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhà xuất bản</label>
                <select
                  value={publisherId}
                  onChange={(e) => setPublisherId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả NXB</option>
                  {initialPublishers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trạng thái</label>
                <select
                  value={processingStatus}
                  onChange={(e) => setProcessingStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="READY">Đã xuất bản (READY)</option>
                  <option value="REVIEW_REQUIRED">Cần duyệt (REVIEW)</option>
                  <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
                  <option value="OCR_REQUIRED">Cần OCR (OCR)</option>
                  <option value="NEW">Mới tạo (NEW)</option>
                  <option value="ERROR">Lỗi (ERROR)</option>
                </select>
              </div>

              {/* Chế độ xem */}
              <div className="flex items-end gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`flex-1 h-9 ${viewMode === "grid" ? "bg-[#00A19A] text-white" : ""}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`flex-1 h-9 ${viewMode === "table" ? "bg-[#00A19A] text-white" : ""}`}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Tìm kiếm */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm theo Tên sách, Môn học, ISBN, Bộ sách..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-[#00A19A]"
                />
              </div>
              <Button type="submit" size="sm" className="bg-[#003B3A] text-white hover:bg-[#002220] px-4 text-xs">
                Tìm kiếm
              </Button>
            </form>
          </div>

          {/* Book Cards Grid / Table */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Đang tải danh sách sách giáo khoa...</div>
          ) : displayedBooks.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Chưa tìm thấy sách giáo khoa phù hợp</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeTab === "my-books"
                  ? "Thầy/Cô chưa có phân công giảng dạy tương ứng hoặc sách giáo khoa cho các môn được phân công chưa được tải lên."
                  : "Thử điều chỉnh lại bộ lọc hoặc tải lên sách giáo khoa mới bằng nút 'Thêm Sách giáo khoa'."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedBooks.map((book) => (
                <div
                  key={book.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-teal-500/50 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Card Visual Header */}
                  <div className="relative h-44 bg-gradient-to-br from-[#003B3A] via-[#005854] to-[#00A19A] p-4 flex flex-col justify-between text-white overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                    <div className="absolute right-4 top-4 opacity-20 group-hover:opacity-30 transition-opacity">
                      <BookOpen className="w-20 h-20 text-white" />
                    </div>

                    <div className="flex items-center justify-between z-10">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-white">
                        Khối {book.grade}
                      </span>
                      {getStatusBadge(book.processingStatus)}
                    </div>

                    <div className="z-10">
                      <p className="text-xs text-teal-200 font-medium">
                        {book.subject?.subjectName} • {book.volume === "TAP_1" ? "Tập 1" : book.volume === "TAP_2" ? "Tập 2" : "Toàn tập"}
                      </p>
                      <h3 className="text-base font-bold text-white line-clamp-2 mt-0.5 leading-snug">
                        {book.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bộ sách:</span>
                        <span className="font-semibold text-slate-800">{book.series?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nhà xuất bản:</span>
                        <span className="text-slate-700 truncate max-w-[170px]">{book.publisher?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mục lục:</span>
                        <span className="text-teal-700 font-medium">
                          {book.chapters?.length || book._count?.chapters || 0} Chương
                        </span>
                      </div>
                      {book.teachingClasses && book.teachingClasses.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400">Lớp dạy:</span>
                          {book.teachingClasses.map((cl: string) => (
                            <span key={cl} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                              {cl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleOpenReader(book, 1)}
                        className="h-8 text-xs bg-[#00A19A] hover:bg-[#008B85] text-white px-2 flex items-center justify-center gap-1 font-medium rounded-lg"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Đọc sách
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenStructure(book)}
                        className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 px-2 flex items-center justify-center gap-1 rounded-lg"
                      >
                        <List className="w-3.5 h-3.5" />
                        Mục lục
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAskAi(book)}
                        className="h-8 text-xs border-teal-300 text-teal-700 bg-teal-50/50 hover:bg-teal-100 px-2 flex items-center justify-center gap-1 rounded-lg font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Hỏi AI
                      </Button>
                    </div>

                    {/* Admin Delete quick action */}
                    {isAdmin && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Xóa sách
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Tên Sách giáo khoa</th>
                    <th className="p-3">Môn & Khối</th>
                    <th className="p-3">Bộ sách & NXB</th>
                    <th className="p-3">Tập / Ấn bản</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#00A19A] shrink-0" />
                          <span>{book.title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-700">{book.subject?.subjectName}</span>
                        <span className="text-slate-400 block text-[11px]">Khối {book.grade}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700">{book.series?.name}</span>
                        <span className="text-slate-400 block text-[11px]">{book.publisher?.name}</span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {book.volume === "TAP_1" ? "Tập 1" : book.volume === "TAP_2" ? "Tập 2" : "Toàn tập"} ({book.editionYear || 2024})
                      </td>
                      <td className="p-3">{getStatusBadge(book.processingStatus)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" onClick={() => handleOpenReader(book, 1)} className="h-7 text-xs bg-[#00A19A] hover:bg-[#008B85] text-white">
                            Đọc
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenStructure(book)} className="h-7 text-xs">
                            Mục lục
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenAskAi(book)} className="h-7 text-xs text-teal-700">
                            AI
                          </Button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Bộ sách & Nhà xuất bản (Admin) */}
      {activeTab === "categories" && isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Danh mục Bộ sách */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00A19A]" /> Danh mục Bộ sách giáo khoa
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {initialSeries.map((ser) => (
                <div key={ser.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{ser.name}</p>
                    <p className="text-[11px] text-slate-400">Mã: {ser.code}</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50">Hoạt động</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Danh mục Nhà xuất bản */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00A19A]" /> Danh mục Nhà xuất bản
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {initialPublishers.map((pub) => (
                <div key={pub.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{pub.name}</p>
                    <p className="text-[11px] text-slate-400">Mã: {pub.code} • {pub.website || "Chưa có website"}</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50">Hoạt động</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Nguồn Whitelist (Admin) */}
      {activeTab === "sources" && isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00A19A]" /> Danh mục Nguồn SGK Whitelist (Chống Crawl Tự Do)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ cho phép import tài liệu từ các domain đã được kiểm duyệt bản quyền.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {sources.map((src) => (
              <div key={src.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{src.sourceName}</span>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">{src.sourceType}</Badge>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px]">{src.baseUrl}</p>
                  <p className="text-slate-400 text-[11px]">
                    Allowed Domains: {src.allowedDomains}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {src.downloadAllowed ? "Cho phép Download" : "Chỉ xem"}
                  </Badge>
                  {src.aiIndexAllowed && (
                    <Badge className="bg-teal-50 text-teal-700 border-teal-200">
                      Cho phép AI Index
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadTextbookModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={() => {
          fetchTextbooks();
          fetchMyTextbooks();
        }}
        subjects={initialSubjects}
        seriesList={initialSeries}
        publishers={initialPublishers}
      />

      {/* In-app PDF Reader Modal */}
      <PdfReaderModal
        open={readerModalOpen}
        onOpenChange={setReaderModalOpen}
        textbook={selectedTextbook}
        initialPage={targetPage}
        onOpenStructure={() => {
          setStructureDrawerOpen(true);
        }}
        onOpenAskAi={() => {
          setAskAiDrawerOpen(true);
        }}
      />

      {/* Structure Table of Contents Drawer */}
      <TextbookStructureDrawer
        open={structureDrawerOpen}
        onOpenChange={setStructureDrawerOpen}
        textbook={selectedTextbook}
        isAdmin={isAdmin}
        onSelectLessonPage={(page) => {
          setTargetPage(page);
          setReaderModalOpen(true);
        }}
        onStructureUpdated={() => {
          fetchTextbooks();
        }}
      />

      {/* Ask AI Drawer */}
      <TextbookAskAiDrawer
        open={askAiDrawerOpen}
        onOpenChange={setAskAiDrawerOpen}
        textbook={selectedTextbook}
        onOpenPage={(page) => {
          setTargetPage(page);
          setReaderModalOpen(true);
        }}
      />
    </div>
  );
}
