import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  Check,
  CreditCard,
  MessageSquare,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Facturación y créditos — Mi Agenda Zen" },
      {
        name: "description",
        content:
          "Consulta tu saldo de créditos de automatización, tu plan activo y compra bolsas de recarga sin caducidad.",
      },
      { property: "og:title", content: "Facturación y créditos — Mi Agenda Zen" },
      {
        property: "og:description",
        content:
          "Saldo de créditos, plan activo, bolsas de recarga e historial de consumo de tu recepcionista IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <BillingPage />
    </AppShell>
  ),
});

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("es-MX");

const PLAN_CREDITS = 420;
const EXTRA_CREDITS = 500;
const MONTHLY_ALLOWANCE = 600;
const CONSUMED = 180;

const PACKS = [
  { id: "basic", name: "Paquete Básico", credits: 500, price: 299, badge: null },
  { id: "standard", name: "Paquete Estándar", credits: 1000, price: 499, badge: "Más popular" },
  { id: "pro", name: "Paquete Pro", credits: 2500, price: 999, badge: "Mejor ahorro" },
] as const;

const FEATURES = [
  "1 Agenda profesional",
  "1 Sucursal / Ubicación",
  "Recepcionista IA 24/7 en WhatsApp",
  "600 créditos mensuales",
];

type Usage = {
  id: string;
  at: string;
  type: string;
  cost: 1 | 3;
  channel: "WhatsApp";
};

function buildUsage(): Usage[] {
  const types = [
    "Mensaje de conversación",
    "Recordatorio automático",
    "Mensaje de conversación",
    "Confirmación de cita",
    "Recordatorio automático",
  ];
  const rows: Usage[] = [];
  const now = new Date();
  for (let i = 0; i < 43; i++) {
    const d = new Date(now.getTime() - i * 5.5 * 3600 * 1000);
    const type = types[i % types.length]!;
    rows.push({
      id: `u-${i}`,
      at: d.toISOString(),
      type,
      cost: type === "Recordatorio automático" ? 3 : 1,
      channel: "WhatsApp",
    });
  }
  return rows;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const cardCls =
  "rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-md";
const inputCls =
  "w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-ring";

function BillingPage() {
  const usage = useMemo(buildUsage, []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    return usage.filter((u) => {
      const d = ymd(new Date(u.at));
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [usage, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const total = PLAN_CREDITS + EXTRA_CREDITS;
  const pct = Math.min(100, Math.round((CONSUMED / MONTHLY_ALLOWANCE) * 100));

  const buy = (name: string, credits: number) =>
    toast.success(`${name}: ${num(credits)} créditos añadidos a tu bolsa extra.`);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Facturación y créditos de automatización
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra tu saldo, tu plan y tus recargas de la recepcionista IA.
        </p>
      </header>

      {/* Saldo actual */}
      <section className={cardCls} aria-labelledby="saldo-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p id="saldo-title" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Wallet className="h-4 w-4 text-gold" />
              Saldo disponible
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {num(total)}{" "}
              <span className="text-base font-semibold text-muted-foreground md:text-lg">
                créditos disponibles
              </span>
            </p>
          </div>
          <span className="rounded-full bg-status-confirmed-bg px-3 py-1 text-xs font-bold text-status-confirmed">
            Cuenta al corriente
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Consumo del plan mensual</span>
            <span className="font-bold text-foreground">
              {num(CONSUMED)} / {num(MONTHLY_ALLOWANCE)} créditos
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={CONSUMED}
            aria-valuemin={0}
            aria-valuemax={MONTHLY_ALLOWANCE}
            aria-label="Consumo del plan mensual"
            className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner"
          >
            <div
              className="h-full rounded-full bg-gradient-to-b from-primary/80 via-primary to-primary/90 shadow-lg"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Créditos del plan
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{num(PLAN_CREDITS)}</p>
            <p className="text-xs text-muted-foreground">Renueva el día 1 de cada mes</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bolsa extra comprada
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{num(EXTRA_CREDITS)}</p>
            <p className="text-xs text-muted-foreground">Sin caducidad</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-gold" />
          <span className="break-words">
            1 mensaje de conversación = 1 crédito | 1 recordatorio automático = 3 créditos
          </span>
        </div>
      </section>

      {/* Plan activo */}
      <section className={cardCls} aria-labelledby="plan-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plan-title" className="text-xl font-bold text-foreground">
            Plan Starter — {money(499)} MXN / mes
          </h2>
          <span className="rounded-full bg-status-confirmed-bg px-3 py-1 text-xs font-bold text-status-confirmed">
            Activo
          </span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => toast.info("Abriendo el portal de suscripción…")}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <CreditCard className="h-4 w-4" />
          Gestionar suscripción
        </button>
      </section>

      {/* Recargas */}
      <section aria-labelledby="recargas-title">
        <h2 id="recargas-title" className="text-xl font-bold text-foreground">
          ¿Necesitas más créditos este mes?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Las recargas nunca vencen.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PACKS.map((p) => (
            <div
              key={p.id}
              className={`${cardCls} flex flex-col ${
                p.badge === "Más popular" ? "ring-2 ring-primary/60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                {p.badge && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
                    {p.badge}
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-extrabold text-foreground">{num(p.credits)}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                créditos
              </p>
              <p className="mt-3 text-lg font-bold text-primary">{money(p.price)} MXN</p>
              <button
                type="button"
                onClick={() => buy(p.name, p.credits)}
                className="btn-3d btn-3d-primary mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold"
              >
                Comprar bolsa
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Historial */}
      <section className={cardCls} aria-labelledby="historial-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="historial-title" className="text-xl font-bold text-foreground">
            Historial de consumo reciente
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} mt-1`}
              />
            </label>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Fecha / Hora</th>
                <th className="py-2 pr-3 font-semibold">Tipo de interacción</th>
                <th className="py-2 pr-3 font-semibold">Créditos</th>
                <th className="py-2 font-semibold">Canal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                    {new Date(u.at).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2.5 pr-3 font-medium break-words text-foreground">{u.type}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.cost === 3
                          ? "bg-status-pending-bg text-status-pending"
                          : "bg-status-completed-bg text-status-completed"
                      }`}
                    >
                      -{u.cost}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-confirmed">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {u.channel}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Sin consumo en el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {filtered.length} registros · página {current} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-40 hover:bg-accent"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-40 hover:bg-accent"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
