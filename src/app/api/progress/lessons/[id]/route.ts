import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { markLessonComplete } from "@/lib/progress";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo alumnos" }, { status: 403 });
    }
    const { id } = await context.params;
    await markLessonComplete(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
