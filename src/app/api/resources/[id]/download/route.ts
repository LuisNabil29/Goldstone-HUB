import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const resource = await prisma.resource.findUnique({ where: { id } });

    if (!resource || !resource.fileKey) {
      return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
    }

    if (session.user.role === "STUDENT" && resource.status !== "PUBLISHED") {
      return NextResponse.json({ error: "No disponible" }, { status: 403 });
    }

    const buffer = await getStorage().get(resource.fileKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": resource.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${resource.fileName || "archivo"}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
