export default function SurveyLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-60 bg-slate-200 rounded-xl mx-auto" />
      <div className="h-4 w-80 bg-slate-100 rounded-md mx-auto" />

      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="h-5 w-3/4 bg-slate-200 rounded" />
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((b) => (
                <div key={b} className="h-10 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
