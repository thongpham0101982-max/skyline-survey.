import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PreschoolWorkflowClient from "./client"

export const dynamic = "force-dynamic"

export default async function KhaoSatMamNonPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  return <PreschoolWorkflowClient />
}
