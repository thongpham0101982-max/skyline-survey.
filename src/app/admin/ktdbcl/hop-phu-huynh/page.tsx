import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import KtdbclParentMeetingAnalyticsClient from "./client";

export const dynamic = "force-dynamic";

export default async function KtdbclParentMeetingPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    return <KtdbclParentMeetingAnalyticsClient />;
}
