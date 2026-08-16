import "dotenv/config";
import { PrismaClient, QuestionType } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DISCLAIMER =
  "Este simulador es una herramienta de preparación formativa. No sustituye el proceso oficial de evaluación del estándar EC0110.02 ni emite una certificación externa. El banco de reactivos no reproduce el instrumento oficial de evaluación.";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@goldstonehub.local" },
    update: { active: true, role: "ADMIN", name: "Admin GoldStone" },
    create: {
      email: "admin@goldstonehub.local",
      name: "Admin GoldStone",
      role: "ADMIN",
      active: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "miguel@goldstonehub.local" },
    update: { active: true, role: "STUDENT", name: "Miguel" },
    create: {
      email: "miguel@goldstonehub.local",
      name: "Miguel",
      role: "STUDENT",
      active: true,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@goldstonehub.local" },
    update: { active: true, role: "INSTRUCTOR", name: "Instructor Externo" },
    create: {
      email: "instructor@goldstonehub.local",
      name: "Instructor Externo",
      role: "INSTRUCTOR",
      active: true,
    },
  });

  let path = await prisma.learningPath.findFirst({ orderBy: { sortOrder: "asc" } });
  if (!path) {
    path = await prisma.learningPath.create({
      data: {
        title: "Ruta EC0110.02",
        description: "Avanza hacia tu certificación y construye tu futuro profesional.",
        status: "PUBLISHED",
        sortOrder: 1,
        heroImageUrl:
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      },
    });
  }

  let course = await prisma.course.findFirst({ where: { learningPathId: path.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        learningPathId: path.id,
        title: "Fundamentos de intermediación inmobiliaria",
        description: "Curso base de la ruta EC0110.02",
        status: "PUBLISHED",
        sortOrder: 1,
      },
    });
  }

  let module = await prisma.module.findFirst({ where: { courseId: course.id } });
  if (!module) {
    module = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Gestión de procesos de servicio",
        description: "Módulo introductorio",
        status: "PUBLISHED",
        sortOrder: 1,
      },
    });
  }

  let lesson = await prisma.lesson.findFirst({ where: { moduleId: module.id } });
  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        moduleId: module.id,
        title: "Gestión de procesos de servicio",
        content:
          "En esta lección revisamos cómo estructurar el proceso de atención al cliente inmobiliario, desde la captación hasta el cierre.",
        status: "PUBLISHED",
        sortOrder: 1,
        estimatedMinutes: 45,
      },
    });
  }

  const activityCount = await prisma.activity.count({ where: { lessonId: lesson.id } });
  if (activityCount === 0) {
    await prisma.activity.createMany({
      data: [
        {
          lessonId: lesson.id,
          title: "Actividad 5 Cuestionario",
          description: "Responde el cuestionario de la lección.",
          status: "PUBLISHED",
          required: true,
          sortOrder: 1,
        },
        {
          lessonId: lesson.id,
          title: "Actividad 6 Estudio de caso",
          description: "Analiza el caso práctico.",
          status: "PUBLISHED",
          required: true,
          sortOrder: 2,
        },
        {
          lessonId: lesson.id,
          title: "Actividad 7 Foro de discusión",
          description: "Comparte tu reflexión (marcar como completada al terminar).",
          status: "PUBLISHED",
          required: false,
          sortOrder: 3,
        },
      ],
    });
  }

  await prisma.enrollment.upsert({
    where: {
      userId_learningPathId: { userId: student.id, learningPathId: path.id },
    },
    update: {},
    create: { userId: student.id, learningPathId: path.id },
  });

  await prisma.instructorAssignment.upsert({
    where: {
      userId_scope_scopeId: {
        userId: instructor.id,
        scope: "COURSE",
        scopeId: course.id,
      },
    },
    update: {},
    create: {
      userId: instructor.id,
      scope: "COURSE",
      scopeId: course.id,
    },
  });

  let certification = await prisma.certification.findUnique({
    where: { code: "EC0110.02" },
  });
  if (!certification) {
    certification = await prisma.certification.create({
      data: {
        code: "EC0110.02",
        title: "Preparación formativa EC0110.02",
        passingScore: 80,
        questionCount: 60,
        durationMinutes: 75,
        disclaimer: DISCLAIMER,
        active: true,
      },
    });
  }

  const blueprintDefaults: Array<{ itemType: QuestionType; count: number }> = [
    { itemType: "MULTIPLE_CHOICE", count: 30 },
    { itemType: "CASE", count: 15 },
    { itemType: "ORDER_PROCESS", count: 5 },
    { itemType: "MULTI_SELECT", count: 5 },
    { itemType: "ERROR_ID", count: 5 },
  ];

  for (const bp of blueprintDefaults) {
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

  const elements = [
    { code: "E1", title: "Captar inmuebles", sortOrder: 1 },
    { code: "E2", title: "Opinar sobre el posible valor", sortOrder: 2 },
    { code: "E3", title: "Vender la intermediación", sortOrder: 3 },
    { code: "E4", title: "Captar y perfilar prospectos", sortOrder: 4 },
    { code: "E5", title: "Iniciar compraventa o arrendamiento", sortOrder: 5 },
    { code: "E6", title: "Cerrar la operación", sortOrder: 6 },
  ];

  const elementRecords = [];
  for (const el of elements) {
    const record = await prisma.competencyElement.upsert({
      where: {
        certificationId_code: {
          certificationId: certification.id,
          code: el.code,
        },
      },
      update: { title: el.title, sortOrder: el.sortOrder },
      create: {
        certificationId: certification.id,
        code: el.code,
        title: el.title,
        sortOrder: el.sortOrder,
      },
    });
    elementRecords.push(record);
  }

  const existingQuestions = await prisma.question.count({
    where: { certificationId: certification.id },
  });

  if (existingQuestions < 60) {
    // Seed enough for one full simulation in development (exact blueprint counts).
    const perType: Array<{ type: QuestionType; count: number }> = [
      { type: "MULTIPLE_CHOICE", count: 30 },
      { type: "CASE", count: 15 },
      { type: "ORDER_PROCESS", count: 5 },
      { type: "MULTI_SELECT", count: 5 },
      { type: "ERROR_ID", count: 5 },
    ];

    let index = 0;
    for (const group of perType) {
      for (let i = 0; i < group.count; i += 1) {
        const element = elementRecords[index % elementRecords.length];
        index += 1;
        const question = await prisma.question.create({
          data: {
            certificationId: certification.id,
            elementId: element.id,
            type: group.type,
            stem: `[${group.type}] Reactivo de práctica ${i + 1} sobre ${element.title}`,
            explanation: `Retroalimentación: revisa el elemento "${element.title}".`,
            active: true,
            createdById: admin.id,
          },
        });

        if (group.type === "ORDER_PROCESS") {
          await prisma.questionOption.createMany({
            data: [
              { questionId: question.id, label: "Paso A", correctOrder: 1, sortOrder: 1 },
              { questionId: question.id, label: "Paso B", correctOrder: 2, sortOrder: 2 },
              { questionId: question.id, label: "Paso C", correctOrder: 3, sortOrder: 3 },
              { questionId: question.id, label: "Paso D", correctOrder: 4, sortOrder: 4 },
            ],
          });
        } else if (group.type === "MULTI_SELECT") {
          await prisma.questionOption.createMany({
            data: [
              { questionId: question.id, label: "Opción correcta 1", isCorrect: true, sortOrder: 1 },
              { questionId: question.id, label: "Opción correcta 2", isCorrect: true, sortOrder: 2 },
              { questionId: question.id, label: "Distractor", isCorrect: false, sortOrder: 3 },
              { questionId: question.id, label: "Distractor 2", isCorrect: false, sortOrder: 4 },
            ],
          });
        } else {
          await prisma.questionOption.createMany({
            data: [
              { questionId: question.id, label: "Respuesta correcta", isCorrect: true, sortOrder: 1 },
              { questionId: question.id, label: "Distractor A", isCorrect: false, sortOrder: 2 },
              { questionId: question.id, label: "Distractor B", isCorrect: false, sortOrder: 3 },
              { questionId: question.id, label: "Distractor C", isCorrect: false, sortOrder: 4 },
            ],
          });
        }
      }
    }
  }

  const resourceCount = await prisma.resource.count();
  if (resourceCount === 0) {
    await prisma.resource.create({
      data: {
        title: "Video introductorio EC0110.02",
        description: "Clase grabada de orientación",
        type: "VIDEO",
        topic: "Introducción",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        libraryVisible: true,
        status: "PUBLISHED",
        lessonId: lesson.id,
        createdById: admin.id,
      },
    });
  }

  console.log("Seed OK");
  console.log("Admin: admin@goldstonehub.local");
  console.log("Student: miguel@goldstonehub.local");
  console.log("Instructor: instructor@goldstonehub.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
