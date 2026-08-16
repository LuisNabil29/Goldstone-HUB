import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canInstructorEdit } from "@/lib/assignments";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await context.params;
    const allowed = await canInstructorEdit(session.user.id, session.user.role, "COURSE", id);
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        learningPath: true,
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              include: { activities: { orderBy: { sortOrder: "asc" } } },
            },
          },
        },
      },
    });
    if (!course) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await context.params;
    const body = patchSchema.parse(await req.json());

    const allowed = await canInstructorEdit(session.user.id, session.user.role, "COURSE", id);
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (body.status === "PUBLISHED" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede publicar" },
        { status: 403 }
      );
    }

    const course = await prisma.course.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
