import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enrollments: { include: { learningPath: true } },
        instructorAssignments: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]).default("STUDENT"),
        learningPathId: z.string().optional(),
        courseId: z.string().optional(),
      })
      .parse(await req.json());

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        role: body.role,
        active: true,
      },
    });

    if (body.role === "STUDENT") {
      const pathId =
        body.learningPathId ||
        (await prisma.learningPath.findFirst({ orderBy: { sortOrder: "asc" } }))?.id;
      if (pathId) {
        await prisma.enrollment.create({
          data: { userId: user.id, learningPathId: pathId },
        });
      }
    }

    if (body.role === "INSTRUCTOR" && body.courseId) {
      await prisma.instructorAssignment.create({
        data: {
          userId: user.id,
          scope: "COURSE",
          scopeId: body.courseId,
        },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
