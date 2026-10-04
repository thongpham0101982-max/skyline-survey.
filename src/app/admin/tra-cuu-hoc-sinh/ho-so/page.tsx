import { Metadata } from "next";
import StudentProfileLookupClient from "./client";

export const metadata: Metadata = {
  title: "Tra cứu Hồ sơ Học sinh | Sky-Line SQMS",
  description: "Tra cứu lý lịch, phân lớp, phụ huynh và hồ sơ lưu chuyển học sinh toàn hệ thống",
};

export default function StudentProfileLookupPage() {
  return <StudentProfileLookupClient />;
}
