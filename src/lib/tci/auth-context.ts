import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TciActorContext } from "./service";

export async function getAuthenticatedTciActor(): Promise<TciActorContext | null> {
    const session = await auth();
    if (!session?.user) return null;

    const user = session.user as any;
    const userId = String(user.id || "");
    const userEmail = user.email ? String(user.email) : null;
    const role = String(user.role || "TEACHER");

    let teacherId: string | null = user.teacherId ? String(user.teacherId) : null;
    let userName = String(user.name || user.fullName || user.email || "Người dùng");
    let campusId: string | null = user.campusId ? String(user.campusId) : null;

    if (!teacherId && (userId || userEmail)) {
        try {
            const teacher = await prisma.teacher.findFirst({
                where: {
                    OR: [
                        ...(userId ? [{ userId }] : []),
                        ...(userEmail ? [{ email: userEmail }] : []),
                    ],
                },
                select: {
                    id: true,
                    teacherName: true,
                    campusId: true,
                },
            });
            if (teacher) {
                teacherId = teacher.id;
                if (teacher.teacherName) userName = teacher.teacherName;
                if (!campusId && teacher.campusId) campusId = teacher.campusId;
            }
        } catch {
            // ignore
        }
    }

    return {
        userId: userId || teacherId || "user",
        userName,
        userEmail,
        role,
        teacherId,
        campusId,
    };
}
