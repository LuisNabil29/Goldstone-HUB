import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        enrollments: { include: { learningPath: true } },
        lessonProgress: { where: { completed: true } },
        activityCompletions: true,
        simulationAttempts: {
          where: { status: { in: ["SUBMITTED", "EXPIRED"] }, mode: "FULL_SIM" },
          orderBy: { submittedAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}
