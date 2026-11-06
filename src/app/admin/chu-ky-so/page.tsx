import { AdminDigitalSignatureConfigClient } from "./client";

export const metadata = {
  title: "Cấu hình Chữ ký số | Admin Sky-Line",
  description: "Cấu hình hệ thống chữ ký số từ xa và nhà cung cấp CA",
};

export default function AdminDigitalSignatureConfigPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <AdminDigitalSignatureConfigClient />
    </div>
  );
}
