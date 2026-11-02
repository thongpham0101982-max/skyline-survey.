import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import TeacherParentMeetingClient from "./client";

export const dynamic = "force-dynamic";

export default async function TeacherParentMeetingPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    return <TeacherParentMeetingClient />;
}
