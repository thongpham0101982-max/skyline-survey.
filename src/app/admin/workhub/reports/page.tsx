import { redirect } from "next/navigation"

export default function RedirectWorkHubReportsToKtdbclWeeklyReports() {
  redirect("/admin/weekly-reports")
}
