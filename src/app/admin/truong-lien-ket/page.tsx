import { getDestinationSchoolsAction } from "./actions"
import { DestinationSchoolsClient } from "./client"

export const metadata = {
  title: "Danh mục Đơn vị Trường | Admin Portal",
  description: "Quản lý danh sách các trường học liên kết, mầm non và phổ thông"
}

export default async function DestinationSchoolsPage() {
  const schools = await getDestinationSchoolsAction()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh mục Đơn vị Trường</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Quản lý thông tin và mã hóa các trường học chuyển đến (Mầm non & Phổ thông).
          </p>
        </div>
      </div>
      <DestinationSchoolsClient initialSchools={schools} />
    </div>
  )
}
