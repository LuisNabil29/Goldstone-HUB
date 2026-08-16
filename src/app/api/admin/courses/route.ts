import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { instructorCourseFilter } from "@/lib/assignments";

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  learningPathId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await requireStaff();
    const filter = await instructorCourseFilter(session.user.id, session.user.role);
    const courses = await prisma.course.findMany({
      where: filter,
      orderBy: { sortOrder: "asc" },
      include: {
        learningPath: true,
        _count: { select: { modules: true } },
      },
    });
    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = courseSchema.parse(await req.json());

    let learningPathId = body.learningPathId;
    if (!learningPathId) {
      const path = await prisma.learningPath.findFirst({ orderBy: { sortOrder: "asc" } });
      if (!path) {
        return NextResponse.json({ error: "Crea una ruta primero" }, { status: 400 });
      }
      learningPathId = path.id;
    }

    const course = await prisma.course.create({
      data: {
        title: body.title,
        description: body.description,
        learningPathId,
        sortOrder: body.sortOrder ?? 0,
        status: "DRAFT",
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
