import { redirect } from "next/navigation"

export default function RedirectAssignedTasksToQaWorkspace() {
  redirect("/admin/tasks")
}
