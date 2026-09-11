import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Banner } from "@/components/Banner";
import { Modal } from "@/components/Modal";
import { Confirm } from "@/components/Confirm";
import { Field, inputCls } from "@/routes/index";
import { api, auth } from "@/lib/api";
import type {
  AISettings,
  AppointmentSlot,
  BusinessHour,
  Location,
  Organization,
  Service,
} from "@/types";

export const Route = createFileRoute("/negocio")({
  head: () => ({
    meta: [
      { title: "Negocio — Mi Agenda Zen" },
      {
        name: "description",
        content: "Ubicaciones, servicios, horarios, cupo y configuración de tu consultorio.",
      },
      { property: "og:title", content: "Negocio — Mi Agenda Zen" },
      {
        property: "og:description",
        content: "Ubicaciones, servicios, horarios, cupo y configuración de tu consultorio.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <NegocioPage />
    </AppShell>
  ),
});

const TABS = ["Ubicaciones", "Servicios", "Horarios", "Cupo", "Configuración"] as const;
type Tab = (typeof TABS)[number];


function NegocioPage() {
  const [tab, setTab] = useState<Tab>("Ubicaciones");
  const orgId = auth.getUser()?.organizationId ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Negocio</h1>

      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ubicaciones" && <LocationsTab orgId={orgId} />}
      {tab === "Servicios" && <ServicesTab orgId={orgId} />}
      {tab === "Horarios" && <HoursTab orgId={orgId} />}
      {tab === "Cupo" && <SlotsTab orgId={orgId} />}
      {tab === "Configuración" && <SettingsTab orgId={orgId} />}
    </div>
  );
}

function CardList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-3">{children}</ul>;
}

function DashedButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      + {label}
    </button>
  );
}

/* ---------------- Ubicaciones ---------------- */

function LocationsTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => api<Location[]>(`/locations?organizationId=${orgId}`),
  });

  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", isActive: true });

  const open = (loc: Location | null) => {
    setError(null);
    setForm({
      name: loc?.name ?? "",
      address: loc?.address ?? "",
      phone: loc?.phone ?? "",
      email: loc?.email ?? "",
      isActive: loc?.isActive ?? true,
    });
    setEditing(loc);
    setCreating(!loc);
    setReadOnly(!!loc);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setReadOnly(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        isActive: form.isActive,
      };
      return editing
        ? api(`/locations/${editing.id}`, { method: "PATCH", body })
        : api("/locations", { method: "POST", body: { organizationId: orgId, ...body } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success(editing ? "Ubicación actualizada" : "Ubicación agregada");
      close();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/locations/${editing!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Ubicación eliminada");
      setConfirming(false);
      close();
    },
    onError: (e: Error) => {
      setConfirming(false);
      setError(e.message);
    },
  });

  return (
    <>
      <CardList>
        {(data ?? []).map((l) => (
          <li key={l.id}>
            <button onClick={() => open(l)} className="card-zen w-full p-4 text-left hover:bg-accent/40">
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.address ?? "Sin dirección"}</p>
              {!l.isActive && <span className="text-xs text-status-completed">Inactiva</span>}
            </button>
          </li>
        ))}
      </CardList>
      <DashedButton label="Nueva ubicación" onClick={() => open(null)} />

      {(editing || creating) && (
        <Modal
          open
          onClose={close}
          title={creating ? "Nueva ubicación" : readOnly ? "Ubicación" : "Editar ubicación"}
        >
          {error && <Banner kind="error" message={error} />}

          {editing && readOnly ? (
            <div className="space-y-3">
              <ReadRow label="Nombre" value={editing.name} />
              <ReadRow label="Dirección" value={editing.address} />
              <ReadRow label="Teléfono" value={editing.phone} />
              <ReadRow label="Correo" value={editing.email} />
              <ReadRow label="Estado" value={editing.isActive ? "Activa" : "Inactiva"} />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReadOnly(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
                <button
                  aria-label="Eliminar ubicación"
                  onClick={() => setConfirming(true)}
                  className="rounded-md border border-border px-3 py-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Nombre">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Dirección">
                <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Teléfono">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Correo">
                <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              {editing && (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Activa
                </label>
              )}
              <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
            </div>
          )}
        </Modal>
      )}

      <Confirm
        open={confirming}
        message={`Se eliminará “${editing?.name ?? ""}” de forma permanente. ¿Deseas continuar?`}
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function ReadRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-border pb-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

/* ---------------- Servicios ---------------- */

function ServicesTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: "55",
    requiredAttendees: "1",
    isActive: true,
  });

  const { data } = useQuery({
    queryKey: ["services", orgId],
    queryFn: () => api<Service[]>(`/services?organizationId=${orgId}`),
  });

  const editing = (data ?? []).find((s) => s.id === editingId) ?? null;

  const open = (s: Service | null) => {
    setError(null);
    setForm({
      name: s?.name ?? "",
      description: s?.description ?? "",
      durationMinutes: String(s?.durationMinutes ?? 55),
      requiredAttendees: String(s?.requiredAttendees ?? 1),
      isActive: s?.isActive ?? true,
    });
    setEditingId(s?.id ?? null);
    setCreating(!s);
  };

  const close = () => {
    setEditingId(null);
    setCreating(false);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        description: form.description || undefined,
        durationMinutes: Number(form.durationMinutes),
        requiredAttendees: Number(form.requiredAttendees),
        isActive: form.isActive,
      };
      return editing
        ? api<Service>(`/services/${editing.id}`, { method: "PATCH", body })
        : api<Service>("/services", { method: "POST", body: { organizationId: orgId, ...body } });
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["services"] });
      if (editing) {
        toast.success("Servicio actualizado");
      } else {
        toast.success("Servicio agregado. Ahora puedes asignarle ubicaciones.");
        setCreating(false);
        setEditingId((created as Service)?.id ?? null);
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/services/${editingId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado");
      setConfirming(false);
      close();
    },
    onError: (e: Error) => {
      setConfirming(false);
      setError(e.message);
    },
  });

  return (
    <>
      <CardList>
        {(data ?? []).map((s) => (
          <li key={s.id}>
            <button onClick={() => open(s)} className="card-zen w-full p-4 text-left hover:bg-accent/40">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.durationMinutes} minutos</p>
            </button>
          </li>
        ))}
      </CardList>
      <DashedButton label="Nuevo servicio" onClick={() => open(null)} />

      {(editing || creating) && (
        <Modal open onClose={close} title={editing ? "Editar servicio" : "Nuevo servicio"}>
          {error && <Banner kind="error" message={error} />}
          <div className="space-y-3">
            <Field label="Nombre">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Descripción">
              <textarea rows={2} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duración de cita (minutos)">
                <input type="number" step={5} min={5} className={inputCls} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </Field>
              <Field label="Personas requeridas">
                <input type="number" className={inputCls} value={form.requiredAttendees} onChange={(e) => setForm({ ...form, requiredAttendees: e.target.value })} />
              </Field>
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Activo
              </label>
            )}
            <div className="flex gap-2">
              <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
              {editing && (
                <button
                  aria-label="Eliminar servicio"
                  onClick={() => setConfirming(true)}
                  className="rounded-md border border-border px-3 py-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {editing && <ServicePrices service={editing} orgId={orgId} />}
            {editing && (
              <button
                onClick={close}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold"
              >
                Listo
              </button>
            )}
          </div>
        </Modal>
      )}

      <Confirm
        open={confirming}
        message={`Se eliminará el servicio “${editing?.name ?? ""}” y sus precios por ubicación. ¿Deseas continuar?`}
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function ServicePrices({ service, orgId }: { service: Service; orgId: string }) {
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState("");
  const [price, setPrice] = useState("");

  const { data: locations } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => api<Location[]>(`/locations?organizationId=${orgId}`),
  });

  const linked = service.serviceLocations ?? [];
  const available = (locations ?? []).filter((l) => !linked.some((sl) => sl.locationId === l.id));

  const add = useMutation({
    mutationFn: () =>
      api("/service-locations", {
        method: "POST",
        body: { serviceId: service.id, locationId, price: Number(price || 0) },
      }),
    onSuccess: async () => {
      const name = (locations ?? []).find((l) => l.id === locationId)?.name ?? "Ubicación";
      setPrice("");
      setLocationId("");
      await qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(`${name} agregada a este servicio`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; price: number }) =>
      api(`/service-locations/${vars.id}`, { method: "PATCH", body: { price: vars.price } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Precio actualizado");
    },
  });

  const unlink = useMutation({
    mutationFn: (id: string) => api(`/service-locations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Ubicación quitada del servicio");
    },
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-bold">Precio por ubicación</h3>
      <ul className="mb-3 space-y-2">
        {linked.map((sl) => (
          <li key={sl.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{sl.location?.name ?? sl.locationId}</span>
            <input
              type="number"
              defaultValue={sl.price}
              onBlur={(e) => update.mutate({ id: sl.id, price: Number(e.target.value) })}
              className="w-24 shrink-0 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <button
              aria-label="Quitar ubicación del servicio"
              onClick={() => unlink.mutate(sl.id)}
              className="shrink-0 rounded-md border border-border p-1.5 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {!linked.length && (
          <li className="text-xs text-muted-foreground">Aún no hay ubicaciones en este servicio.</li>
        )}
      </ul>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
        <select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Ubicación…</option>
          {available.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Precio"
          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          aria-label="Agregar ubicación al servicio"
          onClick={() => locationId && add.mutate()}
          disabled={!locationId || add.isPending}
          className="rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Puedes agregar varias ubicaciones seguidas; la ventana permanece abierta.
      </p>
    </div>
  );
}

/* ---------------- Horarios ---------------- */

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateLabel = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  const txt = d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const toMin = (t: string) => {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
};

function HoursTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BusinessHour | null>(null);
  const [creating, setCreating] = useState(false);
  const [dateOnly, setDateOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [overlapStep, setOverlapStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState({
    date: todayYmd(),
    startTime: "09:00",
    endTime: "18:00",
    appointmentDuration: "55",
    breakDuration: "5",
    capacity: "1",
    locationId: "",
    isActive: true,
  });

  const { data } = useQuery({
    queryKey: ["business-hours", orgId],
    queryFn: () => api<BusinessHour[]>(`/business-hours?organizationId=${orgId}`),
  });
  const { data: locations } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => api<Location[]>(`/locations?organizationId=${orgId}`),
  });

  const today = todayYmd();

  const groups = useMemo(() => {
    const map = new Map<string, BusinessHour[]>();
    (data ?? [])
      .filter((h): h is BusinessHour => Boolean(h?.date))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.startTime ?? "").localeCompare(b.startTime ?? ""),
      )
      .forEach((h) => {
        const list = map.get(h.date) ?? [];
        list.push(h);
        map.set(h.date, list);
      });
    const all = [...map.entries()];
    return {
      past: all.filter(([d]) => d < today),
      upcoming: all.filter(([d]) => d >= today),
    };
  }, [data, today]);

  const open = (h: BusinessHour | null, duplicate = false) => {
    setForm({
      date: duplicate ? today : (h?.date ?? today),
      startTime: h?.startTime ?? "09:00",
      endTime: h?.endTime ?? "18:00",
      appointmentDuration: String(h?.appointmentDuration ?? 55),
      breakDuration: String(h?.breakDuration ?? 5),
      capacity: String(h?.capacity ?? 1),
      locationId: h?.locationId ?? "",
      isActive: h?.isActive ?? true,
    });
    setError(null);
    setDateOnly(duplicate);
    setEditing(duplicate ? null : h);
    setCreating(duplicate || !h);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setDateOnly(false);
    setOverlapStep(0);
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["business-hours"] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        appointmentDuration: Number(form.appointmentDuration),
        breakDuration: Number(form.breakDuration),
        capacity: Number(form.capacity || 1),
        locationId: form.locationId || undefined,
        isActive: form.isActive,
      };
      return editing
        ? api(`/business-hours/${editing.id}`, { method: "PATCH", body })
        : api("/business-hours", { method: "POST", body: { organizationId: orgId, ...body } });
    },
    onSuccess: () => {
      refresh();
      toast.success(editing ? "Horario actualizado" : "Bloque de horario agregado");
      close();
    },
    onError: (e: Error) => setError(e.message),
  });

  const hasOverlap = () => {
    const s = toMin(form.startTime);
    const e = toMin(form.endTime);
    return (data ?? []).some(
      (h) =>
        h.id !== editing?.id &&
        h.date === form.date &&
        s < toMin(h.endTime) &&
        e > toMin(h.startTime),
    );
  };

  const attemptSave = () => {
    setError(null);
    if (toMin(form.endTime) <= toMin(form.startTime)) {
      setError("La hora final debe ser posterior a la inicial.");
      return;
    }
    if (hasOverlap()) {
      setOverlapStep(1);
      return;
    }
    save.mutate();
  };

  const remove = useMutation({
    mutationFn: () => api(`/business-hours/${editing!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast.success("Bloque de horario eliminado");
      setConfirming(false);
      close();
    },
  });

  const renderGroup = ([date, list]: [string, BusinessHour[]]) => (
    <div key={date}>
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-muted-foreground">
        {formatDateLabel(date)}
        {date === today && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            Hoy
          </span>
        )}
      </h2>
      <CardList>
        {list.map((h) => (
          <li key={h.id} className="card-zen flex items-center gap-2 p-4">
            <button onClick={() => open(h)} className="flex-1 text-left">
              <p className="text-lg font-semibold">
                {h.startTime} – {h.endTime}
                {!h.isActive && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Inactivo
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Citas de {h.appointmentDuration} min · Descanso {h.breakDuration} min · Cupo{" "}
                {h.capacity ?? 1}
              </p>
              <p className="text-sm text-muted-foreground">
                {locations?.find((l) => l.id === h.locationId)?.name ?? "Todas las ubicaciones"}
              </p>
            </button>
            <button
              aria-label="Reutilizar este bloque en otra fecha"
              onClick={() => open(h, true)}
              className="shrink-0 rounded-md border border-border p-2 text-gold"
            >
              <Copy className="h-4 w-4" />
            </button>
          </li>
        ))}
      </CardList>
    </div>
  );

  return (
    <>
      <div className="space-y-5">
        {groups.past.length > 0 && (
          <button
            onClick={() => setShowPast((v) => !v)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
          >
            {showPast ? "Ocultar fechas anteriores" : `Ver fechas anteriores (${groups.past.length})`}
          </button>
        )}
        {showPast && groups.past.map(renderGroup)}
        {groups.upcoming.map(renderGroup)}
        {!groups.upcoming.length && (
          <p className="text-sm text-muted-foreground">
            No tienes horarios cargados a partir de hoy.
          </p>
        )}
      </div>
      <DashedButton label="Nuevo bloque de horario" onClick={() => open(null)} />

      {(editing || creating) && (
        <Modal
          open
          onClose={close}
          title={
            dateOnly
              ? "Reutilizar bloque en otra fecha"
              : editing
                ? "Editar horario"
                : "Nuevo bloque de horario"
          }
        >
          {error && <Banner kind="error" message={error} />}
          <div className="space-y-3">
            <Field label="Fecha *">
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            {dateOnly ? (
              <div className="rounded-md bg-muted/60 p-3 text-sm">
                <p className="font-semibold">
                  {form.startTime} – {form.endTime}
                </p>
                <p className="text-xs text-muted-foreground">
                  Citas de {form.appointmentDuration} min · Descanso {form.breakDuration} min · Cupo{" "}
                  {form.capacity} ·{" "}
                  {locations?.find((l) => l.id === form.locationId)?.name ?? "Todas las ubicaciones"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Solo puedes cambiar la fecha de destino.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desde *">
                    <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  </Field>
                  <Field label="Hasta *">
                    <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duración de cita (minutos) *">
                    <input type="number" step={5} min={5} className={inputCls} value={form.appointmentDuration} onChange={(e) => setForm({ ...form, appointmentDuration: e.target.value })} />
                  </Field>
                  <Field label="Descanso (minutos) *">
                    <input type="number" step={5} min={0} className={inputCls} value={form.breakDuration} onChange={(e) => setForm({ ...form, breakDuration: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cupo base">
                    <input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                  </Field>
                  <Field label="Ubicación">
                    <select className={inputCls} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                      <option value="">Todas</option>
                      {(locations ?? []).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {editing && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Activo
                  </label>
                )}
              </>
            )}
            <div className="flex gap-2">
              <SaveButton onClick={attemptSave} pending={save.isPending} />
              {editing && (
                <button
                  aria-label="Eliminar horario"
                  onClick={() => setConfirming(true)}
                  className="rounded-md border border-border px-3 py-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={overlapStep === 1}
        title="Horario existente detectado"
        message="Ya existe un horario configurado para esta fecha. Verifica tus horarios cargados. ¿Deseas continuar de todos modos?"
        confirmLabel="Continuar"
        onConfirm={() => setOverlapStep(2)}
        onCancel={() => setOverlapStep(0)}
      />

      <Confirm
        open={overlapStep === 2}
        title="Confirmación de seguridad"
        message="Atención: Guardar este bloque puede provocar citas encimadas o doble cita en la misma franja horaria. ¿Confirmas esta acción?"
        confirmLabel="Confirmar y guardar"
        cancelLabel="Volver a revisar"
        pending={save.isPending}
        onConfirm={() => {
          setOverlapStep(0);
          save.mutate();
        }}
        onCancel={() => setOverlapStep(0)}
      />

      <Confirm
        open={confirming}
        message="Se eliminará este bloque de horario. ¿Deseas continuar?"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}


/* ---------------- Cupo ---------------- */

function SlotsTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState("");
  const [editing, setEditing] = useState<AppointmentSlot | null>(null);
  const [creating, setCreating] = useState(false);
  const [capacity, setCapacity] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [newSlot, setNewSlot] = useState({ date: "", time: "", duration: "55" });

  const { from, to } = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const { data: locations } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: () => api<Location[]>(`/locations?organizationId=${orgId}`),
  });

  const { data } = useQuery({
    queryKey: ["slots", orgId, locationId, from],
    queryFn: () =>
      api<AppointmentSlot[]>(
        `/appointment-slots?organizationId=${orgId}${locationId ? `&locationId=${locationId}` : ""}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["slots"] });
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return api(`/appointment-slots/${editing.id}`, {
          method: "PATCH",
          body: { capacity: Number(capacity), isActive },
        });
      }
      const start = new Date(`${newSlot.date}T${newSlot.time}`);
      return api("/appointment-slots", {
        method: "POST",
        body: {
          organizationId: orgId,
          locationId: locationId || null,
          startAt: start.toISOString(),
          endAt: new Date(start.getTime() + Number(newSlot.duration) * 60000).toISOString(),
          capacity: Number(capacity),
          isActive,
        },
      });
    },
    onSuccess: () => {
      refresh();
      close();
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/appointment-slots/${editing!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      close();
    },
  });

  return (
    <>
      {(locations ?? []).length > 1 && (
        <select className={`${inputCls} mb-4`} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Todas las ubicaciones</option>
          {locations!.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      <CardList>
        {(data ?? []).map((s) => (
          <li key={s.id}>
            <button
              onClick={() => {
                setEditing(s);
                setCapacity(String(s.capacity));
                setIsActive(s.isActive);
              }}
              className="card-zen flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-accent/40"
            >
              <span className="min-w-0">
                <span className="block font-semibold">
                  {new Date(s.startAt).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {!s.isActive && (
                  <span className="text-xs font-semibold text-status-cancelled">Bloqueado</span>
                )}
              </span>
              <span className="shrink-0 rounded-full bg-status-confirmed-bg px-2.5 py-1 text-[11px] font-semibold text-status-confirmed">
                {s.bookedCount}/{s.capacity}
              </span>
            </button>
          </li>
        ))}
      </CardList>
      <DashedButton
        label="Nuevo horario manual"
        onClick={() => {
          setCreating(true);
          setCapacity("1");
          setIsActive(true);
        }}
      />

      {(editing || creating) && (
        <Modal open onClose={close} title={editing ? "Editar cupo" : "Nuevo horario manual"}>
          <div className="space-y-3">
            {creating && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha">
                    <input type="date" className={inputCls} value={newSlot.date} onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })} />
                  </Field>
                  <Field label="Hora">
                    <input type="time" className={inputCls} value={newSlot.time} onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })} />
                  </Field>
                </div>
                <Field label="Duración (minutos)">
                  <input type="number" step={5} min={5} className={inputCls} value={newSlot.duration} onChange={(e) => setNewSlot({ ...newSlot, duration: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Cupo">
              <input type="number" className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Disponible para agendar
            </label>
            <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
            {editing && editing.bookedCount === 0 && (
              <button
                onClick={() => remove.mutate()}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-destructive"
              >
                Eliminar horario
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

/* ---------------- Configuración ---------------- */

function SettingsTab({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState<null | "ia" | "marca" | "politica">(null);

  const cards = [
    { key: "ia" as const, title: "Asistente de IA", desc: "Nombre, tono y mensajes automáticos." },
    { key: "marca" as const, title: "Marca", desc: "Tema, colores, tipografía y logo." },
    { key: "politica" as const, title: "Política de cancelación", desc: "Plazos y penalizaciones." },
  ];

  return (
    <>
      <CardList>
        {cards.map((c) => (
          <li key={c.key}>
            <button onClick={() => setOpen(c.key)} className="card-zen w-full p-4 text-left hover:bg-accent/40">
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </button>
          </li>
        ))}
      </CardList>

      {open === "ia" && <AIModal orgId={orgId} onClose={() => setOpen(null)} />}
      {open === "marca" && <BrandingModal orgId={orgId} onClose={() => setOpen(null)} />}
      {open === "politica" && <PolicyModal orgId={orgId} onClose={() => setOpen(null)} />}
    </>
  );
}

function AIModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["ai-settings", orgId],
    queryFn: () => api<AISettings | null>(`/ai-settings/organization/${orgId}`),
  });
  const [form, setForm] = useState<Partial<AISettings>>({});
  const value = { ...(data ?? {}), ...form } as AISettings;

  const save = useMutation({
    mutationFn: () =>
      api(`/ai-settings/organization/${orgId}`, {
        method: "PATCH",
        body: {
          enabled: value.enabled ?? false,
          assistantName: value.assistantName ?? "",
          tone: value.tone ?? null,
          welcomeMessage: value.welcomeMessage ?? null,
          sendWelcomeOnFirstMessage: value.sendWelcomeOnFirstMessage ?? false,
          fallbackMessage: value.fallbackMessage ?? null,
          formatWhatsappText: value.formatWhatsappText ?? false,
          allowHumanTakeover: value.allowHumanTakeover ?? false,
        },
      }),
    onSuccess: onClose,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Modal open onClose={onClose} title="Asistente de IA">
      {error && <Banner kind="error" message={error} />}
      <div className="space-y-3">
        <Check label="Activo" checked={!!value.enabled} onChange={(v) => setForm({ ...form, enabled: v })} />
        <Field label="Nombre del asistente">
          <input className={inputCls} value={value.assistantName ?? ""} onChange={(e) => setForm({ ...form, assistantName: e.target.value })} />
        </Field>
        <Field label="Tono">
          <input className={inputCls} value={value.tone ?? ""} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
        </Field>
        <Field label="Mensaje de bienvenida">
          <textarea rows={2} className={inputCls} value={value.welcomeMessage ?? ""} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
        </Field>
        <Check
          label="Enviar en el primer mensaje"
          checked={!!value.sendWelcomeOnFirstMessage}
          onChange={(v) => setForm({ ...form, sendWelcomeOnFirstMessage: v })}
        />
        <Field label="Mensaje de respaldo">
          <textarea rows={2} className={inputCls} value={value.fallbackMessage ?? ""} onChange={(e) => setForm({ ...form, fallbackMessage: e.target.value })} />
        </Field>
        <Check label="Formato WhatsApp" checked={!!value.formatWhatsappText} onChange={(v) => setForm({ ...form, formatWhatsappText: v })} />
        <Check label="Permitir takeover humano" checked={!!value.allowHumanTakeover} onChange={(v) => setForm({ ...form, allowHumanTakeover: v })} />
        <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
      </div>
    </Modal>
  );
}

const FONTS = ["Inter", "Plus Jakarta Sans", "Roboto", "Lato", "Merriweather"];

function LogoPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const src = url.trim();

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
        {!failed && (
          <img
            src={src}
            alt="Vista previa del logo"
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {failed && (
        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
          No se pudo cargar la imagen. Verifica que sea un enlace directo (.png, .jpg o .webp).
        </p>
      )}
    </div>
  );
}

function BrandingModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => api<Organization>(`/organizations/${orgId}`),
  });
  const [form, setForm] = useState<Partial<Organization>>({});
  const value = { ...(data ?? {}), ...form } as Organization;

  const save = useMutation({
    mutationFn: () =>
      api(`/organizations/${orgId}/branding`, {
        method: "PATCH",
        body: {
          theme: value.theme,
          logoUrl: value.logoUrl,
          primaryColor: value.primaryColor,
          secondaryColor: value.secondaryColor,
          fontFamily: value.fontFamily,
          fontScale: value.fontScale,
        },
      }),
    onSuccess: onClose,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Modal open onClose={onClose} title="Marca">
      {error && <Banner kind="error" message={error} />}
      <div className="space-y-3">
        <Field label="Tema">
          <select className={inputCls} value={value.theme ?? "auto"} onChange={(e) => setForm({ ...form, theme: e.target.value as Organization["theme"] })}>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="auto">Automático</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color primario">
            <div className="flex gap-2">
              <input type="color" value={value.primaryColor ?? "#0F766E"} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-9 w-10 rounded-md border border-input" />
              <input className={inputCls} value={value.primaryColor ?? ""} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex gap-2">
              <input type="color" value={value.secondaryColor ?? "#D97706"} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="h-9 w-10 rounded-md border border-input" />
              <input className={inputCls} value={value.secondaryColor ?? ""} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
            </div>
          </Field>
        </div>
        <Field label="Tipografía">
          <select className={inputCls} value={value.fontFamily ?? "Inter"} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}>
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tamaño de texto">
          <select className={inputCls} value={value.fontScale ?? "md"} onChange={(e) => setForm({ ...form, fontScale: e.target.value as Organization["fontScale"] })}>
            <option value="sm">Chico</option>
            <option value="md">Normal</option>
            <option value="lg">Grande</option>
          </select>
        </Field>
        <Field label="URL del logo">
          <input
            className={inputCls}
            placeholder="https://.../mi-logo.png"
            value={value.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
        </Field>
        <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">
          Pega el enlace directo a tu imagen (.png, .jpg o .webp). Puedes alojarla en servicios como
          postimages.org o imgbb.com (copiando la opción «Enlace directo»).
        </p>
        <LogoPreview url={value.logoUrl ?? ""} />
        <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
      </div>
    </Modal>
  );
}

function PolicyModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => api<Organization>(`/organizations/${orgId}`),
  });
  const [form, setForm] = useState<Partial<Organization>>({});
  const value = { ...(data ?? {}), ...form } as Organization;

  const save = useMutation({
    mutationFn: () =>
      api(`/organizations/${orgId}`, {
        method: "PATCH",
        body: {
          allowClientCancellation: value.allowClientCancellation ?? false,
          cancellationDeadlineHours: value.cancellationDeadlineHours ?? null,
          hasCancellationPenalty: value.hasCancellationPenalty ?? false,
          cancellationPenaltyText: value.cancellationPenaltyText ?? null,
        },
      }),
    onSuccess: onClose,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Modal open onClose={onClose} title="Política de cancelación">
      {error && <Banner kind="error" message={error} />}
      <div className="space-y-3">
        <Check
          label="El cliente puede cancelar"
          checked={!!value.allowClientCancellation}
          onChange={(v) => setForm({ ...form, allowClientCancellation: v })}
        />
        {value.allowClientCancellation && (
          <Field label="Plazo mínimo (horas)">
            <input
              type="number"
              className={inputCls}
              value={value.cancellationDeadlineHours ?? ""}
              onChange={(e) => setForm({ ...form, cancellationDeadlineHours: Number(e.target.value) })}
            />
          </Field>
        )}
        <Check
          label="Aplica penalización"
          checked={!!value.hasCancellationPenalty}
          onChange={(v) => setForm({ ...form, hasCancellationPenalty: v })}
        />
        {value.hasCancellationPenalty && (
          <Field label="Texto de penalización">
            <textarea
              rows={3}
              className={inputCls}
              value={value.cancellationPenaltyText ?? ""}
              onChange={(e) => setForm({ ...form, cancellationPenaltyText: e.target.value })}
            />
          </Field>
        )}
        <SaveButton onClick={() => save.mutate()} pending={save.isPending} />
      </div>
    </Modal>
  );
}

/* ---------------- shared ---------------- */

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SaveButton({
  onClick,
  pending,
  label = "Guardar",
}: {
  onClick: () => void;
  pending: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="w-full flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    >
      {label}
    </button>
  );
}
