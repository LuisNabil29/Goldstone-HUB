import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd0,transparent_35%),linear-gradient(180deg,#f4f2ee,#ebe7e0)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="rounded-[1.5rem] bg-surface p-8">Cargando…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
