export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-xs w-full text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-[#0284C7] animate-spin" />
          <div className="absolute w-6 h-6 rounded-full bg-sky-50" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 tracking-tight">Đang tải dữ liệu...</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Skyline Survey System</p>
        </div>
      </div>
    </div>
  )
}
