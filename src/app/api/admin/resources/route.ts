import { NextResponse } from "next/server";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { ResourceType } from "@prisma/client";

export async function GET() {
  try {
    await requireStaff();
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const form = await req.formData();
    const title = String(form.get("title") || "");
    const description = String(form.get("description") || "");
    const type = String(form.get("type") || "PDF") as ResourceType;
    const topic = String(form.get("topic") || "");
    const url = String(form.get("url") || "");
    const lessonId = String(form.get("lessonId") || "") || null;
    const libraryVisible = form.get("libraryVisible") !== "false";
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "Título requerido" }, { status: 400 });
    }

    let fileKey: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (file && file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await getStorage().put(buffer, {
        originalFilename: file.name,
        mimeType: file.type,
        folder: "resources",
      });
      fileKey = stored.key;
      fileName = file.name;
      mimeType = file.type;
    }

    if (!fileKey && !url) {
      return NextResponse.json({ error: "Sube un archivo o indica un enlace" }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description: description || null,
        type,
        topic: topic || null,
        url: url || null,
        fileKey,
        fileName,
        mimeType,
        lessonId,
        libraryVisible,
        status: session.user.role === "ADMIN" ? "PUBLISHED" : "DRAFT",
        createdById: session.user.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
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
    const body = await req.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    if (body.status === "PUBLISHED" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede publicar" },
        { status: 403 }
      );
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        topic: body.topic,
        libraryVisible: body.libraryVisible,
        status: body.status,
        url: body.url,
      },
    });
    return NextResponse.json(resource);
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
    const { id } = await req.json();
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (resource?.fileKey) {
      await getStorage().delete(resource.fileKey);
    }
    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 }
    );
  }
}
