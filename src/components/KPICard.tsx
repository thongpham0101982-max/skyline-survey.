export function KPICard({ title, value, description }: { title: string; value: string | number; description?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col transition-shadow duration-200 hover:shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 tracking-tight text-balance">{title}</h3>
      <div className="mt-2 text-3xl font-black text-slate-900 tabular-nums tracking-tight">{value}</div>
      {description && <p className="mt-1.5 text-xs text-slate-500 font-medium text-pretty">{description}</p>}
    </div>
  )
}
