export default function VerifyRequestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md rounded-[1.5rem] bg-surface border border-border p-8">
        <h1 className="text-2xl font-semibold">Revisa tu correo</h1>
        <p className="mt-3 text-text-secondary">
          Te enviamos un enlace de acceso. Ábrelo desde este mismo dispositivo para continuar.
        </p>
      </div>
    </main>
  );
}
