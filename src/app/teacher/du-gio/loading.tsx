export default function ObservationLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1 sm:p-2">
      {/* Top Banner / Stats Skeleton */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-100/70 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-56 sm:w-72 bg-slate-200 rounded-lg" />
            <div className="h-4 w-40 sm:w-48 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="h-10 w-28 bg-slate-100 rounded-xl" />
          <div className="h-10 w-36 bg-indigo-200/70 rounded-xl" />
        </div>
      </div>

      {/* Main Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[1, 2, 3, 4, 5].map((t) => (
          <div key={t} className="h-10 w-28 sm:w-36 bg-slate-100 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <div key={f} className="h-9 bg-slate-50 border border-slate-200/60 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Slots Table Skeleton */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="h-12 bg-slate-50/80 border-b border-slate-200/80 px-6 flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded hidden sm:block" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="p-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-4 w-36 sm:w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-24 sm:w-32 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col gap-1 items-start">
                <div className="h-3.5 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
