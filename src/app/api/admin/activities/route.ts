import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canInstructorEdit } from "@/lib/assignments";

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const body = z
      .object({
        lessonId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        required: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(await req.json());

    const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId } });
    if (!lesson) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });

    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "MODULE",
      lesson.moduleId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const activity = await prisma.activity.create({
      data: {
        lessonId: body.lessonId,
        title: body.title,
        description: body.description,
        required: body.required ?? true,
        sortOrder: body.sortOrder ?? 0,
        status: "DRAFT",
      },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireStaff();
    const body = z
      .object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        required: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
      })
      .parse(await req.json());

    const activity = await prisma.activity.findUnique({
      where: { id: body.id },
      include: { lesson: true },
    });
    if (!activity) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "MODULE",
      activity.lesson.moduleId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    if (body.status === "PUBLISHED" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede publicar" },
        { status: 403 }
      );
    }

    const { id, ...data } = body;
    const updated = await prisma.activity.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = z.object({ id: z.string() }).parse(await req.json());
    await prisma.activity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
