import { NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib/db";
import { getClientCoachInfo } from "@/lib/coach";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  const [coachInfo, ingestLogs, recentSessions, deviceConnections, userCount] =
    await Promise.all([
      getClientCoachInfo(user.id),
      prisma.healthIngestLog.findMany({
        where: { userId: user.id },
        orderBy: { at: "desc" },
        take: 10,
      }),
      prisma.workoutSession.findMany({
        where: { userId: user.id },
        orderBy: { scheduledFor: "desc" },
        take: 10,
        select: {
          id: true,
          label: true,
          dayType: true,
          status: true,
          source: true,
          scheduledFor: true,
          completedAt: true,
          durationMin: true,
          estKcal: true,
        },
      }),
      prisma.deviceConnection.findMany({
        where: { userId: user.id },
      }),
      prisma.user.count(),
    ]);

  const coachUser = coachInfo.coach
    ? await prisma.user.findUnique({
        where: { id: coachInfo.coach.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;

  const activePlan = coachInfo.coach
    ? await prisma.trainingPlan.findFirst({
        where: { clientId: user.id, active: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const coachProgram = await prisma.workoutProgram.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true, name: true, source: true, goal: true, active: true, createdAt: true },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      goal: user.goal,
    },
    coach: {
      linked: !!coachInfo.coach,
      coachUser,
      permissions: coachInfo.permissions,
      inviteCode: coachInfo.inviteCode,
      activePlan: activePlan
        ? { title: activePlan.title, body: activePlan.body.slice(0, 200), createdAt: activePlan.createdAt }
        : null,
    },
    workoutProgram: coachProgram,
    recentSessions,
    healthSync: {
      connections: deviceConnections.map((d) => ({
        provider: d.provider,
        status: d.status,
        lastSyncAt: d.lastSyncAt,
      })),
      recentIngests: ingestLogs.map((l) => ({
        at: l.at,
        via: l.via,
        source: l.source,
        daysReceived: l.daysReceived,
        workoutsReceived: l.workoutsReceived,
        daysWritten: l.daysWritten,
        workoutsCreated: l.workoutsCreated,
        sessionsCompleted: l.sessionsCompleted,
      })),
    },
    stats: { totalUsers: userCount },
  });
}
