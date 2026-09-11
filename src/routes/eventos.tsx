import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Banner } from "@/components/Banner";
import { Confirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { Field, inputCls } from "@/routes/index";
import { api, auth } from "@/lib/api";
import type { Event as ZenEvent, EventRegistration } from "@/types";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Talleres y eventos — Mi Agenda Zen" },
      { name: "description", content: "Administra talleres, eventos y sus inscritos." },
      { property: "og:title", content: "Talleres y eventos — Mi Agenda Zen" },
      { property: "og:description", content: "Administra talleres, eventos y sus inscritos." },
    ],
  }),
  component: () => (
    <AppShell>
      <EventosPage />
    </AppShell>
  ),
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function EventosPage() {
  const orgId = auth.getUser()?.organizationId ?? "";
  const [editing, setEditing] = useState<ZenEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", orgId],
    queryFn: () => api<ZenEvent[]>(`/events?organizationId=${orgId}`),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Talleres y eventos</h1>
      {error && <Banner kind="error" message={(error as Error).message} />}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando eventos…</p>}

      <ul className="space-y-3">
        {(data ?? []).map((ev) => (
          <li key={ev.id} className="card-zen p-4">
            <button
              onClick={() => setEditing(ev)}
              className="w-full text-left transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{ev.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(ev.startAt)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ev.location?.name ?? ev.venueName ?? "Sin ubicación"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-status-confirmed-bg px-2.5 py-1 text-[11px] font-semibold text-status-confirmed">
                    {ev.bookedCount}/{ev.capacity}
                  </span>
                  {ev.bookedCount >= ev.capacity && (
                    <span className="rounded-full bg-status-pending-bg px-2 py-0.5 text-[10px] font-semibold text-status-pending">
                      Lleno
                    </span>
                  )}
                  {!ev.isActive && (
                    <span className="rounded-full bg-status-completed-bg px-2 py-0.5 text-[10px] font-semibold text-status-completed">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>
            </button>
            {ev.mapsLink && (
              <a
                href={ev.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ver ubicación en el mapa
              </a>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={() => setCreating(true)}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + Nuevo taller o evento
      </button>

      {(creating || editing) && (
        <EventModal
          orgId={orgId}
          event={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EventModal({
  orgId,
  event,
  onClose,
}: {
  orgId: string;
  event: ZenEvent | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(!!event);
  const [askUnlock, setAskUnlock] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [form, setForm] = useState({
    name: event?.name ?? "",
    description: event?.description ?? "",
    start: event ? event.startAt.slice(0, 16) : "",
    end: event ? event.endAt.slice(0, 16) : "",
    capacity: String(event?.capacity ?? 10),
    venueName: event?.venueName ?? "",
    venueAddress: event?.venueAddress ?? "",
    mapsLink: event?.mapsLink ?? "",
    requirements: event?.requirements ?? "",
    isActive: event?.isActive ?? true,
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    onClose();
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        description: form.description || undefined,
        startAt: new Date(form.start).toISOString(),
        endAt: new Date(form.end).toISOString(),
        capacity: Number(form.capacity),
        venueName: form.venueName || undefined,
        venueAddress: form.venueAddress || undefined,
        requirements: form.requirements || undefined,
        isActive: form.isActive,
      };
      return event
        ? api(`/events/${event.id}`, { method: "PATCH", body })
        : api("/events", { method: "POST", body: { organizationId: orgId, ...body } });
    },
    onSuccess: done,
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/events/${event!.id}`, { method: "DELETE" }),
    onSuccess: done,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Modal open onClose={onClose} title={event ? "Editar evento" : "Nuevo taller o evento"}>
      {error && <Banner kind="error" message={error} />}
      <div className="space-y-3">
        <Field label="Nombre">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <textarea
            rows={2}
            className={inputCls}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio">
            <input
              type="datetime-local"
              className={inputCls}
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </Field>
          <Field label="Fin">
            <input
              type="datetime-local"
              className={inputCls}
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Cupo">
          <input
            type="number"
            className={inputCls}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </Field>
        <Field label="Lugar (nombre)">
          <input
            className={inputCls}
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
          />
        </Field>
        <Field label="Dirección">
          <input
            className={inputCls}
            value={form.venueAddress}
            onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
          />
        </Field>
        <Field label="Requisitos">
          <textarea
            rows={2}
            className={inputCls}
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          />
        </Field>
        {event && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Activo
          </label>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Guardar
          </button>
          {event && (
            <button
              aria-label="Eliminar evento"
              onClick={() => remove.mutate()}
              className="rounded-md border border-border px-3 py-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {event && <Registrations eventId={event.id} />}
      </div>
    </Modal>
  );
}

function Registrations({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data } = useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () => api<EventRegistration[]>(`/events/${eventId}/registrations`),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["registrations", eventId] });

  const add = useMutation({
    mutationFn: () =>
      api(`/events/${eventId}/registrations`, {
        method: "POST",
        body: { clientName: name, clientPhone: phone },
      }),
    onSuccess: () => {
      setName("");
      setPhone("");
      refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: (regId: string) =>
      api(`/events/${eventId}/registrations/${regId}/cancel`, { method: "PATCH" }),
    onSuccess: refresh,
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-bold">Inscritos</h3>
      <ul className="mb-3 space-y-2">
        {(data ?? [])
          .filter((r) => r.status === "CONFIRMED")
          .map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {r.clientName} · {r.clientPhone}
              </span>
              <button
                onClick={() => cancel.mutate(r.id)}
                className="shrink-0 text-xs font-semibold text-destructive"
              >
                Cancelar
              </button>
            </li>
          ))}
      </ul>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
        <input placeholder="Nombre" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Teléfono" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button
          aria-label="Agregar inscrito"
          onClick={() => add.mutate()}
          className="shrink-0 rounded-md bg-primary px-3 text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
