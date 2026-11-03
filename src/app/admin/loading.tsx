export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse pb-10">
      {/* Compact Welcome Banner Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-56 bg-slate-200 rounded-md" />
            <div className="h-3 w-40 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 bg-slate-100 rounded-lg" />
          <div className="h-7 w-24 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Unified 5-Dimension Filter Bar Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-7 w-36 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl border border-slate-200/60" />
          ))}
        </div>
      </div>

      {/* Smart Alert Center Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-64 bg-slate-200 rounded-md" />
          <div className="h-6 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-xl border border-slate-200/60 p-3 space-y-2">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 6 Executive KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-slate-100 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded-md" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="pt-2 border-t border-slate-100 flex justify-between">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-3 w-12 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Combined Analytical Charts Skeleton (8/4 Split) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-64 bg-slate-200 rounded" />
              <div className="h-3.5 w-48 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-28 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-[280px] bg-slate-50 rounded-xl border border-slate-100" />
        </div>
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-3.5 w-36 bg-slate-100 rounded" />
          </div>
          <div className="h-[280px] bg-slate-50 rounded-xl border border-slate-100" />
        </div>
      </div>
    </div>
  )
}
