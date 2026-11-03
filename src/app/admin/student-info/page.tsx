import { redirect } from "next/navigation"
import { fetchStudentInfoPageData } from "./fetchData"
import { StudentInfoClient } from "./client"

export const metadata = { title: "Danh sách Khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";

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

  const data = await fetchStudentInfoPageData();

  return (
    <div className="space-y-6">
      <StudentInfoClient 
        pageMode="danh-sach"
        initialTab={initialTab}
        initialSubTab={initialSubTab === "periods" ? "periods" : "students"}
        {...data}
      />
    </div>
  )
}
