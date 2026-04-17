export function KPICard({ title, value, description }: { title: string; value: string | number; description?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
      <h3 className="text-sm font-medium text-slate-500 tracking-tight">{title}</h3>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
  )
}