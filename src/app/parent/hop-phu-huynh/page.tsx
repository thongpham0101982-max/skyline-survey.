import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ParentMeetingPortalClient from "./client";

export const dynamic = "force-dynamic";

export default async function ParentMeetingPortalPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    return <ParentMeetingPortalClient />;
}
