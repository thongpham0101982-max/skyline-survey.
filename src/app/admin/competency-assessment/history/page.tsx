import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HistoryClient } from "./client";

export const metadata: Metadata = {
  title: "Lịch Sử Import ĐGNL & Rollback | Sky-Line",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  return <HistoryClient currentUser={user} />;
}
