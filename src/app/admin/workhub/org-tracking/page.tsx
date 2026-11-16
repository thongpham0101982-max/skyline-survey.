import { redirect } from "next/navigation"

export default function RedirectOrgTrackingToOverview() {
  redirect("/admin/workhub")
}
