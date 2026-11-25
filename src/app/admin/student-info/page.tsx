import { redirect } from "next/navigation"
import { fetchStudentInfoPageData } from "./fetchData"
import { StudentInfoClient } from "./client"
import { EntranceWorkflowStepper } from "@/components/entrance/EntranceWorkflowStepper"

export const metadata = { title: "Danh sách Khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function StudentInfoPage(props: {
  searchParams?: Promise<{ tab?: string; subTab?: string }> | { tab?: string; subTab?: string };
}) {
  const resolvedParams = props.searchParams ? await props.searchParams : {};
  const rawTab = resolvedParams?.tab;
  const initialTab = rawTab === "preschool" ? "preschool" : rawTab === "transfer" ? "transfer" : "general";
  const initialSubTab = resolvedParams?.subTab || "students";

  // Redirect old subTab=info or subTab=result to /admin/ket-qua-khao-sat
  if (initialSubTab === "info" || initialSubTab === "result") {
    redirect(`/admin/ket-qua-khao-sat?tab=${initialTab}&subTab=${initialSubTab}`);
  }

  const data = await fetchStudentInfoPageData({ pageMode: "danh-sach" });

  return (
    <div className="space-y-4">
      <EntranceWorkflowStepper activeStep="list" />
      <StudentInfoClient 
        pageMode="danh-sach"
        initialTab={initialTab}
        initialSubTab={
          initialSubTab === "periods"
            ? "periods"
            : initialSubTab === "handover"
            ? "handover"
            : initialSubTab === "students_i"
            ? "students_i"
            : initialSubTab === "students_s"
            ? "students_s"
            : initialTab === "general"
            ? "students_s"
            : "students"
        }
        {...data}
      />
    </div>
  )
}
