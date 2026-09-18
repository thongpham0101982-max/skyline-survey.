export default function StudentPortalLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Student Banner Skeleton */}
      <div className="p-6 bg-white rounded-3xl border border-sky-100 shadow-xs flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-slate-200 shrink-0" />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="h-6 w-48 bg-slate-200 rounded-lg mx-auto sm:mx-0" />
          <div className="h-4 w-64 bg-slate-100 rounded mx-auto sm:mx-0" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-2xl" />
      </div>

      {/* Feature cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100" />
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
