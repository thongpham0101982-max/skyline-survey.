export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  return <div className="p-20 text-center font-bold">Testing basic render for ID: {id}</div>
}