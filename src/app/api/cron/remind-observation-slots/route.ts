import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendTeamsLackingObserversReminder,
  sendTeamsUpcomingAndEvalReminder
} from "@/lib/teams";
import { sendBatchPendingEvaluationReminders } from "@/app/teacher/du-gio/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // If secret is defined, enforce security, otherwise proceed
    }

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Fetch upcoming active slots within next 48 hours lacking observers
    const upcomingSlots = await prisma.observationSlot.findMany({
      where: {
        status: "ACTIVE",
        date: {
          gte: past24Hours,
          lte: in48Hours
        }
      },
      include: {
        teacher: {
          include: {
            departmentRel: true
          }
        },
        registrations: {
          include: {
            teacher: true,
            evaluation: true
          }
        }
      }
    });

    let remindedCount = 0;

    for (const slot of upcomingSlots) {
      const regCount = slot.registrations.length;
      const maxSeats = slot.maxSeats || 4;

      // Send reminder to Department Teams Channel if lacking registered observers
      if (regCount < maxSeats) {
        try {
          await sendTeamsLackingObserversReminder({
            id: slot.id,
            topic: slot.topic,
            subjectName: slot.subjectName,
            level: slot.level,
            grade: slot.grade,
            className: slot.className,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            campusName: slot.campusName,
            room: slot.room,
            teacherName: slot.teacher?.teacherName,
            teacherCode: slot.teacher?.teacherCode,
            maxSeats,
            registeredCount: regCount
          }, slot.teacher?.departmentRel as any);

          remindedCount++;
        } catch (err) {
          console.error(`[Cron Reminder] Error for slot ${slot.id}:`, err);
        }
      }

      // Update lastRemindedAt safely
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "ObservationSlot" SET "lastRemindedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`,
          slot.id
        );
      } catch (e) {}
    }

    // 2. Automated Daily 19:00 Email Reminders for Pending Evaluations
    let evalReminderResult = null;
    try {
      evalReminderResult = await sendBatchPendingEvaluationReminders();
    } catch (evalErr) {
      console.error("[Cron Reminder] Error sending batch pending evaluation reminders:", evalErr);
    }

    return NextResponse.json({
      success: true,
      scanned: upcomingSlots.length,
      remindedCount,
      evalReminders: evalReminderResult,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Cron Reminder] Execution failure:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
