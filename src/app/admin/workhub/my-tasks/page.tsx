import { redirect } from "next/navigation"

export default function RedirectMyTasksToQaWorkspace() {
  redirect("/admin/tasks?scope=mine")
}
