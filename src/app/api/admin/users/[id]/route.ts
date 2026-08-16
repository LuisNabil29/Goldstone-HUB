import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = z
      .object({
        name: z.string().optional(),
        active: z.boolean().optional(),
        role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]).optional(),
        learningPathId: z.string().optional().nullable(),
        courseId: z.string().optional().nullable(),
      })
      .parse(await req.json());

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        active: body.active,
        role: body.role,
      },
    });

    if (body.learningPathId) {
      await prisma.enrollment.upsert({
        where: {
          userId_learningPathId: {
            userId: id,
            learningPathId: body.learningPathId,
          },
        },
        update: {},
        create: { userId: id, learningPathId: body.learningPathId },
      });
    }

    if (body.courseId) {
      await prisma.instructorAssignment.upsert({
        where: {
          userId_scope_scopeId: {
            userId: id,
            scope: "COURSE",
            scopeId: body.courseId,
          },
        },
        update: {},
        create: { userId: id, scope: "COURSE", scopeId: body.courseId },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
