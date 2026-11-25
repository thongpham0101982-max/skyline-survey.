import { redirect } from "next/navigation"
import { fetchStudentInfoPageData } from "../student-info/fetchData"
import { KetQuaKhaoSatClient } from "./client"
import { EntranceWorkflowStepper } from "@/components/entrance/EntranceWorkflowStepper"

export const metadata = { title: "Kết quả khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function KetQuaKhaoSatPage(props: {
  searchParams?: Promise<{ tab?: string; subTab?: string }> | { tab?: string; subTab?: string };
}) {
  const resolvedParams = props.searchParams ? await props.searchParams : {};
  const initialTab =
    resolvedParams?.tab === "preschool"
      ? "preschool"
      : resolvedParams?.tab === "transfer"
      ? "transfer"
      : "general";
  const initialSubTab = resolvedParams?.subTab || "batch";

  // Redirect periods/students to /admin/student-info
  if (initialSubTab === "periods" || initialSubTab === "students") {
    redirect(`/admin/student-info?tab=${initialTab}&subTab=${initialSubTab}`);
  }

  const data = await fetchStudentInfoPageData({ pageMode: "ket-qua" });

  return (
    <div className="space-y-4">
      <EntranceWorkflowStepper activeStep="results" />
      <KetQuaKhaoSatClient 
        initialTab={initialTab}
        initialSubTab={
          initialSubTab === "result"
            ? "result"
            : initialSubTab === "info"
            ? "info"
            : "batch"
        }
        {...data}
      />
    </div>
  )
}
