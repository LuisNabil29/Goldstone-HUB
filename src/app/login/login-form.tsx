"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const authError = searchParams.get("error");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const result = await signIn("nodemailer", {
        email: email.trim().toLowerCase(),
        redirect: false,
        callbackUrl: searchParams.get("callbackUrl") || "/inicio",
      });

      if (result?.error) {
        setStatus("error");
        setError(
          result.error === "Configuration" || result.error === "EmailSignin"
            ? "No encontramos una invitación activa para este correo."
            : "No se pudo enviar el enlace. Intenta de nuevo."
        );
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setError("No se pudo enviar el enlace. Intenta de nuevo.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-[1.5rem] bg-surface p-8 shadow-sm border border-border">
        <h1 className="text-2xl font-semibold text-text-primary">Revisa tu correo</h1>
        <p className="mt-3 text-text-secondary">
          Si tu cuenta está activa, enviamos un enlace de acceso a <strong>{email}</strong>.
        </p>
        <p className="mt-4 text-sm text-text-muted">
          En desarrollo local sin SMTP, el enlace también aparece en la consola del servidor.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.5rem] bg-surface p-8 shadow-sm border border-border space-y-5"
    >
      <div>
        <p className="text-sm font-medium text-gold-strong">GoldStone Hub</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
          Acceso seguro
        </h1>
        <p className="mt-2 text-text-secondary">
          Ingresa el correo con el que fuiste invitado. Te enviaremos un enlace de un solo uso.
        </p>
      </div>

      {(error || authError) && (
        <div className="rounded-[0.75rem] bg-red-50 px-4 py-3 text-sm text-error">
          {error ||
            (authError === "AccessDenied"
              ? "Tu correo no tiene invitación activa."
              : "No se pudo iniciar sesión.")}
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-secondary">Correo electrónico</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[0.75rem] border border-border bg-surface-alt px-4 py-3 outline-none focus:border-gold"
          placeholder="tu@correo.com"
        />
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-gold px-5 py-3 font-semibold text-graphite hover:bg-gold-strong disabled:opacity-60"
      >
        {status === "loading" ? "Enviando…" : "Enviar enlace de acceso"}
      </button>
    </form>
  );
}
