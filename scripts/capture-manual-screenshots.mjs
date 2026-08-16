/**
 * Capturas reales para DocProyecto/ManualUsuario.md
 * Requiere: app en http://localhost:3040 y DB seed.
 * Sin SMTP, Auth.js escribe el enlace en uploads/last-magic-link.txt
 */
import "dotenv/config";
import { mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { chromium } from "playwright";

const BASE = process.env.AUTH_URL || "http://localhost:3040";
const OUT = path.join(process.cwd(), "DocProyecto", "imagenesManual");
const LINK_FILE = path.join(process.cwd(), "uploads", "last-magic-link.txt");

async function getCsrf(page) {
  const res = await page.request.get(`${BASE}/api/auth/csrf`);
  const data = await res.json();
  return data.csrfToken;
}

async function requestMagicLink(page, email) {
  try {
    await unlink(LINK_FILE);
  } catch {
    // ignore
  }

  const csrfToken = await getCsrf(page);
  await page.request.post(`${BASE}/api/auth/signin/nodemailer`, {
    form: {
      email,
      csrfToken,
      callbackUrl: `${BASE}/inicio`,
      json: "true",
    },
  });

  for (let i = 0; i < 40; i += 1) {
    try {
      const raw = await readFile(LINK_FILE, "utf8");
      const lines = raw.trim().split(/\r?\n/);
      const fileEmail = lines[0]?.trim();
      const url = lines[1]?.trim();
      if (url && fileEmail?.toLowerCase() === email.toLowerCase()) {
        return url;
      }
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No se encontró magic link en ${LINK_FILE} para ${email}`);
}

async function loginWithMagicLink(page, email, callbackPath) {
  let url = await requestMagicLink(page, email);
  // Forzar callbackPath deseado
  const u = new URL(url);
  u.searchParams.set("callbackUrl", `${BASE}${callbackPath}`);
  url = u.toString();
  const res = await page.goto(url, { waitUntil: "networkidle" });
  console.log("login status", res?.status(), "final", page.url());
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("OK", name, "at", page.url());
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot(page, "01_login.png");

  await loginWithMagicLink(page, "miguel@goldstonehub.local", "/inicio");
  await page.goto(`${BASE}/inicio`, { waitUntil: "networkidle" });
  await shot(page, "02_dashboard_alumno.png");

  await page.goto(`${BASE}/mi-ruta`, { waitUntil: "networkidle" });
  await shot(page, "03_mi_ruta.png");

  const lessonLink = page.locator('a[href*="/mi-ruta/lecciones/"]').first();
  if ((await lessonLink.count()) > 0) {
    await lessonLink.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "04_leccion_detalle.png");
  } else {
    console.log("SKIP 04_leccion_detalle.png (sin lecciones visibles)");
  }

  await page.goto(`${BASE}/actividades`, { waitUntil: "networkidle" });
  await shot(page, "05_actividades.png");

  await page.goto(`${BASE}/biblioteca`, { waitUntil: "networkidle" });
  await shot(page, "06_biblioteca_alumno.png");

  await page.goto(`${BASE}/simulador`, { waitUntil: "networkidle" });
  await shot(page, "07_simulador.png");

  await page.goto(`${BASE}/perfil`, { waitUntil: "networkidle" });
  await shot(page, "08_perfil.png");

  await context.clearCookies();
  await loginWithMagicLink(page, "admin@goldstonehub.local", "/admin");
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await shot(page, "09_admin_resumen.png");

  await page.goto(`${BASE}/admin/cursos`, { waitUntil: "networkidle" });
  await shot(page, "10_admin_cursos.png");

  const courseOpen = page.getByRole("link", { name: "Abrir" }).first();
  if ((await courseOpen.count()) > 0) {
    await courseOpen.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "11_admin_curso_detalle.png");
  } else {
    console.log("SKIP 11_admin_curso_detalle.png");
  }

  await page.goto(`${BASE}/admin/alumnos`, { waitUntil: "networkidle" });
  await shot(page, "12_admin_alumnos.png");

  await page.goto(`${BASE}/admin/biblioteca`, { waitUntil: "networkidle" });
  await shot(page, "13_admin_biblioteca.png");

  await page.goto(`${BASE}/admin/simulador`, { waitUntil: "networkidle" });
  await shot(page, "14_admin_simulador.png");

  await page.goto(`${BASE}/admin/resultados`, { waitUntil: "networkidle" });
  await shot(page, "15_admin_resultados.png");

  await context.clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "miguel@goldstonehub.local");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  await shot(page, "01b_login_enlace_enviado.png");

  await browser.close();
  console.log("Capturas listas en", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
