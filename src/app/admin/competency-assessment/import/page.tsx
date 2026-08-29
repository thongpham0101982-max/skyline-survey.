import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportWizardClient } from "./client";

export const metadata: Metadata = {
  title: "Import Đánh Giá Năng Lực Học Sinh | Sky-Line",
  description: "Trình import wizard dữ liệu đánh giá năng lực môn học học sinh",
};

export default async function CompetencyImportPage() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "TEACHER")) {
    redirect("/login");
  }

  return <ImportWizardClient currentUser={user} />;
}
