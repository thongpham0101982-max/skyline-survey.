
import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export function PreschoolMoveToBatchModal({
  selectedIds,
  onClose,
  onSuccess,
  periods
}: {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
  periods: any[];
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePeriod = periods.find(p => p.id === selectedPeriodId);
  const activeBatches = activePeriod?.batches || [];

  const handleSubmit = async () => {
    if (!selectedPeriodId) {
      alert("Vui lòng chọn kỳ khảo sát");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_UPDATE_BATCH",
          ids: selectedIds,
          periodId: selectedPeriodId,
          batchId: selectedBatchId || undefined
        })
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");
      alert("Đã chuyển đợt khảo sát thành công");
      onSuccess();
    } catch (e: any) {
      alert(e.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg">Chuyển đợt khảo sát (Mầm non)</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-[#00A99D]/10 text-[#00A99D] px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            Đang chọn {selectedIds.length} học sinh
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Chọn kỳ KS mới *</label>
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  setSelectedBatchId("");
                }}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] transition-all"
              >
                <option value="">-- Chọn kỳ khảo sát --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedPeriodId && activeBatches.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Chọn đợt KS mới</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] transition-all"
                >
                  <option value="">-- Gán vào đợt (Không bắt buộc) --</option>
                  {activeBatches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-all text-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPeriodId}
            className="px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
