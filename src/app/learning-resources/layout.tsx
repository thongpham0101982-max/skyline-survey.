import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { AcademicYearSelector } from "@/components/AcademicYearSelector";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger";
import { SSMAssistantWidget } from "@/components/SSMAssistantWidget";
import { prisma } from "@/lib/db";
import { getRoleReadableModules } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LearningResourcesLayout({
  children
}: {
  children: React.ReactNode;
}) {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error in LearningResourcesLayout:", e);
  }

  if (!session?.user) {
    redirect("/login");
  }

  const roleCode = (session?.user as any)?.role || "TEACHER";
  const upperRole = (roleCode || "").toUpperCase().trim();
  const isAdmin = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "BAN_DHCM", "KT_DBCL"].includes(upperRole);

  let readableModules: string[] = [];
  let isTTCM = false;
  let isGVCN = false;

  try {
    readableModules = await getRoleReadableModules(roleCode);
    if (session?.user?.id) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { position: true, homeroomClass: true }
      });
      if (teacher) {
        isTTCM = teacher.position === "TTCM";
        isGVCN = !!teacher.homeroomClass;
      }
    }
  } catch (e) {}

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar SSM */}
      <Sidebar
        role={isAdmin ? "ADMIN" : "TEACHER"}
        actualRole={roleCode}
        permissionModules={readableModules}
        isTTCM={isTTCM}
        isGVCN={isGVCN}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sky-Line Deep Pine Header */}
        <header className="h-14 bg-[#003B3A] text-white flex items-center justify-between px-4 shrink-0 shadow-md z-20">
          <div className="flex items-center gap-3">
            <MobileMenuTrigger />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">SSM SKY-LINE</span>
              <span className="text-white/40 text-xs">/</span>
              <span className="text-xs font-medium text-teal-300">Học liệu & Sách giáo khoa số</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher theme="dark" />
            <AcademicYearSelector />
            <NotificationBell />
            <UserMenu user={session.user} />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <SSMAssistantWidget />
    </div>
  );
}
