import { redirect } from "next/navigation"
import { fetchStudentInfoPageData } from "../student-info/fetchData"
import { KetQuaKhaoSatClient } from "./client"

export const metadata = { title: "Kết quả khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function KetQuaKhaoSatPage(props: {
  searchParams?: Promise<{ tab?: string; subTab?: string }> | { tab?: string; subTab?: string };
}) {
  const resolvedParams = props.searchParams ? await props.searchParams : {};
  const initialTab = resolvedParams?.tab === "preschool" ? "preschool" : "general";
  const initialSubTab = resolvedParams?.subTab || "info";

  // Redirect periods/students to /admin/student-info
  if (initialSubTab === "periods" || initialSubTab === "students") {
    redirect(`/admin/student-info?tab=${initialTab}&subTab=${initialSubTab}`);
  }

  const data = await fetchStudentInfoPageData();

  return (
    <div className="space-y-6">
      <KetQuaKhaoSatClient 
        initialTab={initialTab}
        initialSubTab={initialSubTab === "result" ? "result" : "info"}
        {...data}
      />
    </div>
  )
}
