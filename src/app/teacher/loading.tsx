export default function TeacherLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Teacher Top Info Card Skeleton */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-60 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 bg-slate-100 rounded-xl" />
          <div className="h-9 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Grid of classes / activities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-4/5 bg-slate-100 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Schedule / Tasks Table Skeleton */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="h-5 w-44 bg-slate-200 rounded mb-4" />
        {[1, 2, 3, 4].map((r) => (
          <div key={r} className="h-11 bg-slate-50 rounded-xl flex items-center justify-between px-4 gap-4">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-3.5 w-40 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
