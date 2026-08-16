import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";
import { validateBankCoverage } from "@/lib/simulator";

export async function GET() {
  try {
    await requireAdmin();
    const certification = await prisma.certification.findFirst({
      where: { active: true },
      include: {
        blueprints: true,
        elements: { orderBy: { sortOrder: "asc" } },
        _count: { select: { questions: true } },
      },
    });

    const counts = await prisma.question.groupBy({
      by: ["type"],
      where: { active: true, certificationId: certification?.id },
      _count: { type: true },
    });

    const countsByType: Record<string, number> = {};
    for (const row of counts) {
      countsByType[row.type] = row._count.type;
    }

    const coverage = certification
      ? validateBankCoverage(certification.blueprints, countsByType)
      : { ok: false, missing: [] };

    return NextResponse.json({ certification, countsByType, coverage });
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
    const body = z
      .object({
        elementId: z.string(),
        type: z.enum([
          "MULTIPLE_CHOICE",
          "CASE",
          "ORDER_PROCESS",
          "MULTI_SELECT",
          "ERROR_ID",
        ]),
        stem: z.string().min(1),
        explanation: z.string().optional(),
        options: z.array(
          z.object({
            label: z.string().min(1),
            isCorrect: z.boolean().optional(),
            correctOrder: z.number().int().optional().nullable(),
          })
        ),
      })
      .parse(await req.json());

    const certification = await prisma.certification.findFirst({ where: { active: true } });
    if (!certification) {
      return NextResponse.json({ error: "Sin certificación activa" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        certificationId: certification.id,
        elementId: body.elementId,
        type: body.type as QuestionType,
        stem: body.stem,
        explanation: body.explanation,
        createdById: session.user.id,
        options: {
          create: body.options.map((o, idx) => ({
            label: o.label,
            isCorrect: o.isCorrect ?? false,
            correctOrder: o.correctOrder ?? null,
            sortOrder: idx + 1,
          })),
        },
      },
      include: { options: true },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = z
      .object({
        passingScore: z.number().int().optional(),
        questionCount: z.number().int().optional(),
        durationMinutes: z.number().int().optional(),
        disclaimer: z.string().optional(),
        blueprints: z
          .array(
            z.object({
              itemType: z.enum([
                "MULTIPLE_CHOICE",
                "CASE",
                "ORDER_PROCESS",
                "MULTI_SELECT",
                "ERROR_ID",
              ]),
              count: z.number().int().min(0),
            })
          )
          .optional(),
      })
      .parse(await req.json());

    const certification = await prisma.certification.findFirst({ where: { active: true } });
    if (!certification) {
      return NextResponse.json({ error: "Sin certificación activa" }, { status: 400 });
    }

    const updated = await prisma.certification.update({
      where: { id: certification.id },
      data: {
        passingScore: body.passingScore,
        questionCount: body.questionCount,
        durationMinutes: body.durationMinutes,
        disclaimer: body.disclaimer,
      },
    });

    if (body.blueprints) {
      for (const bp of body.blueprints) {
        await prisma.examBlueprint.upsert({
          where: {
            certificationId_itemType: {
              certificationId: certification.id,
              itemType: bp.itemType,
            },
          },
          update: { count: bp.count },
          create: {
            certificationId: certification.id,
            itemType: bp.itemType,
            count: bp.count,
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
