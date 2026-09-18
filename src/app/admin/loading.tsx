export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded-md" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="h-9 w-64 bg-slate-100 rounded-xl" />
          <div className="h-9 w-36 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="h-12 bg-slate-50 rounded-xl flex items-center justify-between px-4 gap-4">
              <div className="h-4 w-12 bg-slate-200 rounded" />
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
