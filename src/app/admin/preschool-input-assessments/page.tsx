import { redirect } from "next/navigation"

export default function PreschoolInputAssessmentsRedirectPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const query = new URLSearchParams()
  query.set("tab", "preschool")
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "tab" && typeof value === "string") {
      query.set(key, value)
    }
  }
  redirect(`/admin/cau-hinh-khao-sat?${query.toString()}`)
}
