import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AliasesClient } from "./client";

export const metadata: Metadata = {
  title: "Từ Điển Alias Môn Học & Năng Lực | Sky-Line",
};

export default async function AliasesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  return <AliasesClient currentUser={user} />;
}
