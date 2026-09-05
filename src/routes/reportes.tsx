import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Banner } from "@/components/Banner";
import { api, auth } from "@/lib/api";
import type { Report } from "@/types";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Mi Agenda Zen" },
      { name: "description", content: "Ocupación, cancelaciones y servicios más agendados." },
      { property: "og:title", content: "Reportes — Mi Agenda Zen" },
      { property: "og:description", content: "Ocupación, cancelaciones y servicios más agendados." },
    ],
  }),
  component: () => (
    <AppShell>
      <ReportesPage />
    </AppShell>
  ),
});

const PRESETS = [7, 30, 90];

function ReportesPage() {
  const orgId = auth.getUser()?.organizationId ?? "";
  const [days, setDays] = useState(30);

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [days]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", orgId, days],
    queryFn: () =>
      api<Report>(
        `/organizations/${orgId}/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Reportes</h1>

      <div className="mb-5 flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setDays(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              days === p
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {p} días
          </button>
        ))}
      </div>

      {error && <Banner kind="error" message={(error as Error).message} />}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando reporte…</p>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Citas totales" value={data.appointments.total} />
            <Tile label="Ocupación" value={`${Math.round(data.slotOccupancy.rate * 100)}%`} />
            <Tile label="Canceladas" value={data.appointments.cancelled.total} />
            <Tile label="Reagendadas" value={data.appointments.rescheduled.appointments} />
          </div>

          <Section title="Citas por estado">
            {Object.entries(data.appointments.byStatus).map(([k, v]) => (
              <Bar key={k} label={k} value={v} max={data.appointments.total} />
            ))}
          </Section>

          {data.appointments.cancelled.total > 0 && (
            <Section title="Cancelaciones por quién">
              {Object.entries(data.appointments.cancelled.byWho).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={data.appointments.cancelled.total} />
              ))}
            </Section>
          )}

          <Section title="Servicios más agendados">
            {data.topServices.slice(0, 5).map((s, i) => (
              <Bar
                key={s.serviceId ?? i}
                label={s.name ?? "Sin servicio"}
                value={s.count}
                max={data.topServices[0]?.count || 1}
              />
            ))}
          </Section>

          <Section title="Eventos">
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Eventos" value={data.events.total} />
              <Tile label="Inscritos" value={data.events.registrations.total} />
              <Tile label="Cancelados" value={data.events.registrations.cancelled} />
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-zen p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-zen p-4">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
