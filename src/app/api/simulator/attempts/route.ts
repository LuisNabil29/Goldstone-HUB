import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  startErrorReview,
  startFullSimulation,
  startTopicPractice,
} from "@/lib/simulator";

const bodySchema = z.object({
  mode: z.enum(["FULL_SIM", "TOPIC_PRACTICE", "ERROR_REVIEW"]),
  elementId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo alumnos" }, { status: 403 });
    }

    const body = bodySchema.parse(await req.json());
    let attempt;
    switch (body.mode) {
      case "FULL_SIM":
        attempt = await startFullSimulation(session.user.id);
        break;
      case "TOPIC_PRACTICE":
        if (!body.elementId) {
          return NextResponse.json({ error: "elementId requerido" }, { status: 400 });
        }
        attempt = await startTopicPractice(session.user.id, body.elementId);
        break;
      case "ERROR_REVIEW":
        attempt = await startErrorReview(session.user.id);
        break;
      default: {
        const _exhaustive: never = body.mode;
        return NextResponse.json({ error: `Modo inválido: ${_exhaustive}` }, { status: 400 });
      }
    }

    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
