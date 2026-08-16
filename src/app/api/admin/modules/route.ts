import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canInstructorEdit } from "@/lib/assignments";

const moduleSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const body = moduleSchema.parse(await req.json());
    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "COURSE",
      body.courseId
    );
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const module = await prisma.module.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        description: body.description,
        sortOrder: body.sortOrder ?? 0,
        status: "DRAFT",
      },
    });
    return NextResponse.json(module, { status: 201 });
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
        sortOrder: z.number().int().optional(),
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
      })
      .parse(await req.json());

    const allowed = await canInstructorEdit(
      session.user.id,
      session.user.role,
      "MODULE",
      body.id
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
    const module = await prisma.module.update({ where: { id }, data });
    return NextResponse.json(module);
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
    await prisma.module.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
