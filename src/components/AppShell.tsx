import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, CalendarDays, LogOut, Moon, Store, Sun, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BusinessBrand, PlatformSeal } from "@/components/Brand";
import { api, auth } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import type { Organization } from "@/types";

const NAV = [
  { to: "/", label: "Hoy", icon: CalendarDays },
  { to: "/eventos", label: "Eventos", icon: Sparkles },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/negocio", label: "Negocio", icon: Store },
] as const;

function ThemeToggle({ full = false }: { full?: boolean }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
        full ? "w-full" : ""
      }`}
    >
      <Icon className="h-4 w-4 text-gold" />
      {full && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<{ fullName: string; organizationId: string } | null>(null);
  const [checked, setChecked] = useState(false);

  const orgId = user?.organizationId;
  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => api<Organization>(`/organizations/${orgId}`),
    enabled: !!orgId,
  });
  const businessName = org?.name ?? "Mi Negocio";

  useEffect(() => {
    const current = auth.getUser();
    if (!auth.getToken() || !current) {
      navigate({ to: "/login" });
      return;
    }
    setUser(current);
    setChecked(true);
  }, [navigate]);

  const logout = () => {
    auth.clear();
    navigate({ to: "/login" });
  };

  if (!checked) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="px-2 py-3">
          <BusinessBrand name={businessName} logoUrl={org?.logoUrl} />
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user?.fullName}</p>
          <ThemeToggle full />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-card px-4 py-3 md:hidden">
        <Brand size="sm" />
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <button
            onClick={logout}
            aria-label="Salir"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 pb-28 md:ml-64 md:px-8 md:py-8">{children}</main>

      {/* Bottom nav móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
