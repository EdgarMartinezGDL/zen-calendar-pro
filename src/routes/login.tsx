import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Banner } from "@/components/Banner";
import { Brand } from "@/components/Brand";
import { auth, login } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Mi Agenda Zen" },
      {
        name: "description",
        content: "Accede a Mi Agenda Zen para gestionar las citas de tu consultorio.",
      },
      { property: "og:title", content: "Iniciar sesión — Mi Agenda Zen" },
      {
        property: "og:description",
        content: "Accede a Mi Agenda Zen para gestionar las citas de tu consultorio.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState(USE_MOCK ? "demo@miagendazen.mx" : "");
  const [password, setPassword] = useState(USE_MOCK ? "demo1234" : "");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.getToken()) navigate({ to: "/" });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      auth.save(res.access_token, res.user);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <button
        onClick={toggle}
        aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
        className="fixed top-4 right-4 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ThemeIcon className="h-5 w-5 text-gold" />
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>

        <form onSubmit={onSubmit} className="card-zen p-5">
          <h1 className="mb-1 text-lg font-bold">Bienvenido de nuevo</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Ingresa con tu cuenta profesional.
          </p>

          {error && <Banner kind="error" message={error} />}

          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
