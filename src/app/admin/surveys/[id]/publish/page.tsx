export default function PublishSurveyPage() {
  return (
    <div className="p-20 text-center">
      <h1 className="text-4xl font-black">TEST MODE: STATIC PAGE</h1>
      <p className="mt-4 text-slate-500">If you see this, the routing works. The crash is in the database connection.</p>
      <a href="/admin/surveys" className="mt-10 inline-block px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold">Quay lại</a>
    </div>
  )
}
