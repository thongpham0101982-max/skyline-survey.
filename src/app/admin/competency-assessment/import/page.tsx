import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleReadableModules } from "@/lib/permissions";
import { ImportWizardClient } from "./client";

export const metadata: Metadata = {
  title: "Import Đánh giá Năng lực Học sinh | Sky-Line",
  description: "Trình import wizard dữ liệu đánh giá năng lực môn học học sinh",
};

export default async function CompetencyImportPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) {
    redirect("/login");
  }
  const role = String(user.role || "").toUpperCase().trim();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "TEACHER") {
    const readable = await getRoleReadableModules(role);
    if (!readable.includes("COMPETENCY_IMPORT") && !readable.includes("QL_DGNL")) {
      redirect("/login");
    }
  }

  return <ImportWizardClient currentUser={user} />;
}
