import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Banner } from "@/components/Banner";
import { Modal } from "@/components/Modal";
import { api, auth } from "@/lib/api";
import type { Appointment, AppointmentStatus, OrganizationContext } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agenda del día — Mi Agenda Zen" },
      {
        name: "description",
        content: "Consulta y gestiona las citas de tu consultorio día por día.",
      },
      { property: "og:title", content: "Agenda del día — Mi Agenda Zen" },
      {
        property: "og:description",
        content: "Consulta y gestiona las citas de tu consultorio día por día.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <HoyPage />
    </AppShell>
  ),
});

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  PENDING: "bg-status-pending-bg text-status-pending",
  CONFIRMED: "bg-status-confirmed-bg text-status-confirmed",
  CANCELLED: "bg-status-cancelled-bg text-status-cancelled",
  COMPLETED: "bg-status-completed-bg text-status-completed",
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function HoyPage() {
  const orgId = auth.getUser()?.organizationId ?? "";
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { day, from, to } = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { day: d, from: d.toISOString(), to: end.toISOString() };
  }, [offset]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["appointments", orgId, isoDay(day)],
    queryFn: () =>
      api<Appointment[]>(
        `/appointments?organizationId=${orgId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  const appointments = data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">{offset === 0 ? "Hoy" : "Agenda"}</h1>
        <div className="mt-3 flex items-center gap-2">
          <button
            aria-label="Día anterior"
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-md border border-border p-2 transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="flex-1 text-center text-xl font-bold capitalize tracking-tight md:text-2xl">
            {fmtDate(day)}
          </p>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Hoy
            </button>
          )}
          <button
            aria-label="Día siguiente"
            onClick={() => setOffset((o) => o + 1)}
            className="rounded-md border border-border p-2 transition-colors hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && <Banner kind="error" message={(error as Error).message} />}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando citas…</p>}
      {!isLoading && !error && appointments.length === 0 && (
        <div className="card-zen p-8 text-center text-sm text-muted-foreground">
          No hay citas para este día.
        </div>
      )}

      <ul className="space-y-3">
        {appointments.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setDetail(a)}
              className="card-zen grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40"
            >
              <span className="shrink-0 text-sm font-bold text-primary">{fmtTime(a.startAt)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{a.clientName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {a.service?.name ?? "Sin servicio"} · {a.location?.name ?? "Sin ubicación"}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[a.status]}`}
              >
                {STATUS_LABEL[a.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        aria-label="Nueva cita"
        onClick={() => setNewOpen(true)}
        className="fixed right-5 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-8"
      >
        <Plus className="h-6 w-6" />
      </button>

      <DetailModal
        appointment={detail}
        onClose={() => setDetail(null)}
        onDone={() => {
          setDetail(null);
          qc.invalidateQueries({ queryKey: ["appointments"] });
        }}
      />
      <NewAppointmentModal
        open={newOpen}
        orgId={orgId}
        onClose={() => setNewOpen(false)}
        onDone={() => {
          setNewOpen(false);
          qc.invalidateQueries({ queryKey: ["appointments"] });
        }}
      />
    </div>
  );
}

function DetailModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [view, setView] = useState<"detail" | "reschedule" | "cancel">("detail");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setView("detail");
    setError(null);
    onClose();
  };

  const cancelM = useMutation({
    mutationFn: () =>
      api(`/appointments/${appointment!.id}/cancel?by=PROFESSIONAL`, {
        method: "PATCH",
        body: { reason: reason || undefined },
      }),
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });

  const rescheduleM = useMutation({
    mutationFn: () => {
      const start = new Date(`${date}T${time}`);
      const duration =
        new Date(appointment!.endAt).getTime() - new Date(appointment!.startAt).getTime();
      return api(`/appointments/${appointment!.id}/reschedule?by=PROFESSIONAL`, {
        method: "PATCH",
        body: {
          startAt: start.toISOString(),
          endAt: new Date(start.getTime() + duration).toISOString(),
        },
      });
    },
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });

  if (!appointment) return null;
  const editable = appointment.status === "PENDING" || appointment.status === "CONFIRMED";

  return (
    <Modal open onClose={close} title="Detalle de la cita">
      {error && <Banner kind="error" message={error} />}

      {view === "detail" && (
        <div className="space-y-1">
          <Row label="Cliente" value={appointment.clientName} />
          <Row label="Teléfono" value={appointment.clientPhone} />
          <Row label="Edad" value={appointment.age ? String(appointment.age) : "—"} />
          <Row label="Servicio" value={appointment.service?.name ?? "—"} />
          <Row label="Ubicación" value={appointment.location?.name ?? "—"} />
          <Row
            label="Fecha"
            value={`${fmtDate(new Date(appointment.startAt))} · ${fmtTime(appointment.startAt)}`}
          />
          <Row label="Notas" value={appointment.notes ?? "—"} />
          {editable && (
            <div className="flex gap-3 pt-5">
              <button
                onClick={() => setView("reschedule")}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground"
              >
                Reagendar
              </button>
              <button
                onClick={() => setView("cancel")}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-base font-semibold text-destructive"
              >
                Cancelar cita
              </button>
            </div>
          )}
        </div>
      )}

      {view === "reschedule" && (
        <div className="space-y-3">
          <Field label="Nueva fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Nueva hora">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </Field>
          <button
            disabled={!date || !time || rescheduleM.isPending}
            onClick={() => rescheduleM.mutate()}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Confirmar nueva fecha
          </button>
        </div>
      )}

      {view === "cancel" && (
        <div className="space-y-3">
          <Field label="Motivo (opcional)">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <button
            disabled={cancelM.isPending}
            onClick={() => cancelM.mutate()}
            className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            Confirmar cancelación
          </button>
        </div>
      )}
    </Modal>
  );
}

function NewAppointmentModal({
  open,
  orgId,
  onClose,
  onDone,
}: {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    age: "",
    locationId: "",
    serviceId: "",
    date: "",
    time: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [askOptional, setAskOptional] = useState(false);

  const isValid =
    !!form.clientName.trim() &&
    !!form.clientPhone.trim() &&
    !!form.date &&
    !!form.time &&
    !!form.locationId;

  const missingOptional = !form.age.trim() || !form.serviceId || !form.notes.trim();

  const submit = () => {
    if (!isValid) return;
    if (missingOptional) {
      setAskOptional(true);
      return;
    }
    create.mutate(false);
  };

  const { data: context } = useQuery({
    queryKey: ["org-context", orgId],
    queryFn: () => api<OrganizationContext>(`/organizations/${orgId}/context`),
    enabled: open && !!orgId,
  });

  const create = useMutation({
    mutationFn: (force: boolean) => {
      const service = context?.services.find((s) => s.id === form.serviceId);
      const start = new Date(`${form.date}T${form.time}`);
      const end = new Date(start.getTime() + (service?.durationMinutes ?? 30) * 60000);
      return api(`/appointments${force ? "?raiseCapacityIfFull=true" : ""}`, {
        method: "POST",
        body: {
          organizationId: orgId,
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          age: form.age ? Number(form.age) : undefined,
          locationId: form.locationId,
          serviceId: form.serviceId || undefined,
          notes: form.notes.trim() || undefined,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        },
      });
    },
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nueva cita">
      {error && <Banner kind="error" message={error} />}
      <div className="space-y-3">
        <Field label="Cliente *">
          <input
            className={inputCls}
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
        </Field>
        <Field label="Teléfono *">
          <input
            className={inputCls}
            value={form.clientPhone}
            onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
          />
        </Field>
        <Field label="Edad (opcional)">
          <input
            type="number"
            className={inputCls}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </Field>
        <Field label="Ubicación">
          <select
            className={inputCls}
            value={form.locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {context?.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servicio">
          <select
            className={inputCls}
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {context?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              className={inputCls}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </Field>
        </div>
        <button
          disabled={create.isPending}
          onClick={() => create.mutate(false)}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Agendar cita
        </button>
        {create.error && (create.error as { status?: number }).status === 409 && (
          <button
            onClick={() => create.mutate(true)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-gold"
          >
            Agendar de todos modos
          </button>
        )}
      </div>
    </Modal>
  );
}

export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <span className="block text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-lg font-semibold leading-snug md:text-xl">{value}</span>
    </div>
  );
}
