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
        moduleId: z.string(),
        title: z.string().min(1),
        content: z.string().optional(),
        sortOrder: z.number().int().optional(),
        estimatedMinutes: z.number().int().optional(),
      })
      .parse(await req.json());

    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "MODULE",
      body.moduleId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: body.moduleId,
        title: body.title,
        content: body.content,
        sortOrder: body.sortOrder ?? 0,
        estimatedMinutes: body.estimatedMinutes,
        status: "DRAFT",
      },
    });
    return NextResponse.json(lesson, { status: 201 });
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
        content: z.string().optional().nullable(),
        sortOrder: z.number().int().optional(),
        estimatedMinutes: z.number().int().optional().nullable(),
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
      })
      .parse(await req.json());

    const lesson = await prisma.lesson.findUnique({ where: { id: body.id } });
    if (!lesson) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "MODULE",
      lesson.moduleId
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
    const updated = await prisma.lesson.update({ where: { id }, data });
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
    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
