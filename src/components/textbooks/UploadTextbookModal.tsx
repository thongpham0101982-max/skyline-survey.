"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Link2,
  FileText,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Info
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface UploadTextbookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subjects: any[];
  seriesList: any[];
  publishers: any[];
}

export function UploadTextbookModal({
  open,
  onOpenChange,
  onSuccess,
  subjects,
  seriesList,
  publishers
}: UploadTextbookModalProps) {
  const [sourceType, setSourceType] = useState<"UPLOAD_PDF" | "IMPORT_URL">("UPLOAD_PDF");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("8");
  const [seriesId, setSeriesId] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [volume, setVolume] = useState("TAP_1");
  const [editionYear, setEditionYear] = useState(2024);
  const [isbn, setIsbn] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [licenseNote, setLicenseNote] = useState("Bản quyền thuộc Bộ GD&ĐT & NXB");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-select publisher when series is selected
  useEffect(() => {
    if (seriesId && seriesList.length > 0) {
      const selected = seriesList.find((s) => s.id === seriesId);
      if (selected?.publisherId) {
        setPublisherId(selected.publisherId);
      }
    }
  }, [seriesId, seriesList]);

  // Set defaults when modal opens
  useEffect(() => {
    if (open) {
      if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
      if (seriesList.length > 0 && !seriesId) setSeriesId(seriesList[0].id);
      if (publishers.length > 0 && !publisherId) setPublisherId(publishers[0].id);
      setErrorMsg("");
      setFile(null);
    }
  }, [open, subjects, seriesList, publishers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!subjectId || !grade || !seriesId || !publisherId) {
      setErrorMsg("Vui lòng chọn đầy đủ Môn học, Khối, Bộ sách và Nhà xuất bản.");
      return;
    }

    if (sourceType === "UPLOAD_PDF" && !file) {
      setErrorMsg("Vui lòng chọn tệp PDF sách giáo khoa.");
      return;
    }

    if (sourceType === "IMPORT_URL" && !sourceUrl.trim()) {
      setErrorMsg("Vui lòng nhập đường dẫn URL sách giáo khoa.");
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (sourceType === "UPLOAD_PDF" && file) {
        const formData = new FormData();
        formData.append("subjectId", subjectId);
        formData.append("grade", grade);
        formData.append("seriesId", seriesId);
        formData.append("publisherId", publisherId);
        formData.append("volume", volume);
        formData.append("editionYear", String(editionYear));
        formData.append("isbn", isbn);
        formData.append("sourceType", "UPLOAD_PDF");
        formData.append("licenseNote", licenseNote);
        formData.append("file", file);

        res = await fetch("/api/learning-resources/textbooks", {
          method: "POST",
          body: formData
        });
      } else {
        res = await fetch("/api/learning-resources/textbooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId,
            grade,
            seriesId,
            publisherId,
            volume,
            editionYear,
            isbn,
            sourceType: "IMPORT_URL",
            sourceUrl,
            licenseNote
          })
        });
      }

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Thêm Sách giáo khoa thành công! Hệ thống đang xử lý cấu trúc ngầm.");
        onOpenChange(false);
        onSuccess();
      } else {
        setErrorMsg(data.error || "Không thể tải lên Sách giáo khoa.");
      }
    } catch (err: any) {
      setErrorMsg("Đã xảy ra lỗi kết nối: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-[#00A19A] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            Thêm mới Sách giáo khoa vào SSM
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Phương thức nhập (Tabs) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSourceType("UPLOAD_PDF")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sourceType === "UPLOAD_PDF"
                  ? "bg-white text-[#003B3A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Tải lên tệp PDF
            </button>
            <button
              type="button"
              onClick={() => setSourceType("IMPORT_URL")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sourceType === "IMPORT_URL"
                  ? "bg-white text-[#003B3A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" /> Import từ URL Whitelist
            </button>
          </div>

          {/* Môn học & Khối lớp */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Môn học <span className="text-red-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName} ({s.subjectCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khối lớp <span className="text-red-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={String(g)}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bộ sách & Nhà xuất bản */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bộ sách <span className="text-red-500">*</span>
              </label>
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              >
                {seriesList.map((ser) => (
                  <option key={ser.id} value={ser.id}>
                    {ser.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhà xuất bản <span className="text-red-500">*</span>
              </label>
              <select
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              >
                {publishers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tập & Năm xuất bản */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tập</label>
              <select
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              >
                <option value="TAP_1">Tập 1</option>
                <option value="TAP_2">Tập 2</option>
                <option value="TOAN_TAP">Toàn tập</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Năm xuất bản</label>
              <input
                type="number"
                value={editionYear}
                onChange={(e) => setEditionYear(Number(e.target.value))}
                min={2018}
                max={2030}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã ISBN</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="VD: 978-604-..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
              />
            </div>
          </div>

          {/* Upload File PDF HOẶC URL Whitelist */}
          {sourceType === "UPLOAD_PDF" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tệp PDF sách giáo khoa <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-[#00A19A] rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer block">
                  <FileText className="w-8 h-8 text-[#00A19A] mx-auto mb-2" />
                  {file ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{file.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Nhấp để chọn tệp PDF từ máy tính
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Dung lượng tối đa khuyến nghị: 150MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đường dẫn URL sách <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://hanhtrangso.nxbgd.vn/..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:border-[#00A19A]"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                Chỉ cho phép liên kết từ các tên miền đã đăng ký trong danh mục Whitelist.
              </p>
            </div>
          )}

          {/* Ghi chú bản quyền */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú bản quyền</label>
            <input
              type="text"
              value={licenseNote}
              onChange={(e) => setLicenseNote(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:border-[#00A19A]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#00A19A] hover:bg-[#008B85] text-white font-medium px-4"
            >
              {loading ? "Đang xử lý..." : "Lưu & Bắt đầu nhận diện"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
