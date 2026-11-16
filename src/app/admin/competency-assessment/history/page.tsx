import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleReadableModules } from "@/lib/permissions";
import { HistoryClient } from "./client";

export const metadata: Metadata = {
  title: "Lịch sử Import ĐGNL & Rollback | Sky-Line",
};

export default async function HistoryPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) {
    redirect("/login");
  }
  const role = String(user.role || "").toUpperCase().trim();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    const readable = await getRoleReadableModules(role);
    if (!readable.includes("COMPETENCY_HISTORY") && !readable.includes("QL_DGNL")) {
      redirect("/login");
    }
  }

  return <HistoryClient currentUser={user} />;
}
