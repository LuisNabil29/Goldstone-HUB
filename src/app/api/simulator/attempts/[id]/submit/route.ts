import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { submitAttempt } from "@/lib/simulator";

const bodySchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedIds: z.array(z.string()).optional(),
      orderedIds: z.array(z.string()).optional(),
    })
  ),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo alumnos" }, { status: 403 });
    }
    const { id } = await context.params;
    const body = bodySchema.parse(await req.json());
    const attempt = await submitAttempt(session.user.id, id, body.answers);
    return NextResponse.json(attempt);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
