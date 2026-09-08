import { redirect } from "next/navigation";

export default async function MaTranDuGioTTCMPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  params.set("tab", "ma-tran");
  
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "tab") {
      params.set(key, value);
    }
  }

  redirect(`/admin/tong-hop-du-gio?${params.toString()}`);
}
