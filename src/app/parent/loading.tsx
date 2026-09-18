export default function ParentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome banner skeleton */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-2xl" />
      </div>

      {/* Children list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-200" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-36 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
              <div className="h-3 w-full bg-slate-200 rounded" />
              <div className="h-3 w-4/5 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
