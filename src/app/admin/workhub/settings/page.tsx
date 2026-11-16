import { redirect } from "next/navigation"

export default function RedirectSettingsToKpiConfig() {
  redirect("/admin/workhub/kpis?tab=definitions")
}
