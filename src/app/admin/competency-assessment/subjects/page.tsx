import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleReadableModules } from "@/lib/permissions";
import { CompetencySubjectsClient } from "./client";

export const metadata: Metadata = {
  title: "Danh mục Mã môn Đánh giá năng lực | Sky-Line",
};

export default async function CompetencySubjectsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) {
    redirect("/login");
  }
  const role = String(user.role || "").toUpperCase().trim();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    const readable = await getRoleReadableModules(role);
    if (
      !readable.includes("COMPETENCY_SUBJECTS") &&
      !readable.includes("COMPETENCY_ALIASES") &&
      !readable.includes("QL_DGNL")
    ) {
      redirect("/login");
    }
  }

  return <CompetencySubjectsClient currentUser={user} />;
}
