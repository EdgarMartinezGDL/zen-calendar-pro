import type {
  AISettings,
  Appointment,
  AppointmentSlot,
  BusinessHour,
  Event as ZenEvent,
  EventRegistration,
  Location,
  Report,
  Service,
  ServiceLocation,
} from "@/types";
import { db, newId, ORG_ID } from "./db";

export class MockHttpError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload ?? { message };
  }
}

type Body = Record<string, unknown>;

const between = (iso: string, from?: string | null, to?: string | null) =>
  (!from || iso >= from) && (!to || iso <= to);

const rel = (id: string | null | undefined, list: { id: string; name: string }[]) => {
  const found = list.find((l) => l.id === id);
  return found ? { id: found.id, name: found.name } : null;
};

function hydrateAppointment(a: Appointment): Appointment {
  return {
    ...a,
    location: rel(a.locationId, db.locations),
    service: rel(a.serviceId, db.services),
  };
}

function withLocation(sl: ServiceLocation): ServiceLocation {
  const location = rel(sl.locationId, db.locations);
  return location ? { ...sl, location } : { ...sl };
}

function hydrateService(s: Service): Service {
  return {
    ...s,
    serviceLocations: db.serviceLocations
      .filter((sl) => sl.serviceId === s.id)
      .map(withLocation),
  };
}

function hydrateEvent(e: ZenEvent): ZenEvent {
  const bookedCount = db.registrations.filter(
    (r) => r.eventId === e.id && r.status === "CONFIRMED",
  ).length;
  return {
    ...e,
    bookedCount,
    isFull: bookedCount >= e.capacity,
    location: rel(e.locationId, db.locations),
  };
}

function buildReport(from: string, to: string): Report {
  const appts = db.appointments.filter((a) => between(a.startAt, from, to));
  const byStatus = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
  for (const a of appts) byStatus[a.status] += 1;

  const byWho = { CLIENT: 0, PROFESSIONAL: 0, UNKNOWN: 0 };
  for (const a of appts.filter((a) => a.status === "CANCELLED")) {
    byWho[db.cancelledBy[a.id] ?? "UNKNOWN"] += 1;
  }

  const counts = new Map<string, number>();
  for (const a of appts) counts.set(a.serviceId ?? "", (counts.get(a.serviceId ?? "") ?? 0) + 1);
  const topServices = [...counts.entries()]
    .map(([serviceId, count]) => ({
      serviceId: serviceId || null,
      name: db.services.find((s) => s.id === serviceId)?.name ?? null,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const slots = db.slots.filter((s) => between(s.startAt, from, to));
  const totalCapacity = slots.reduce((n, s) => n + s.capacity, 0);
  const totalBooked = slots.reduce((n, s) => n + s.bookedCount, 0);

  const events = db.events.filter((e) => between(e.startAt, from, to));
  const regs = db.registrations.filter((r) => events.some((e) => e.id === r.eventId));

  return {
    range: { from, to },
    appointments: {
      total: appts.length,
      byStatus,
      cancelled: { total: byStatus.CANCELLED, byWho },
      rescheduled: {
        appointments: Object.keys(db.rescheduled).length,
        totalReschedules: Object.values(db.rescheduled).reduce((a, b) => a + b, 0),
      },
    },
    topServices,
    slotOccupancy: {
      totalCapacity,
      totalBooked,
      rate: totalCapacity > 0 ? totalBooked / totalCapacity : 0,
    },
    events: {
      total: events.length,
      registrations: {
        total: regs.length,
        cancelled: regs.filter((r) => r.status === "CANCELLED").length,
      },
    },
  };
}

function patch<T extends object>(target: T, body: Body): T {
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) (target as Record<string, unknown>)[k] = v;
  }
  return target;
}

/** Resuelve una petición contra la base de datos en memoria. */
export function handleMockRequest(path: string, method: string, body: Body | null): unknown {
  const [rawPath, rawQuery = ""] = path.split("?");
  const q = new URLSearchParams(rawQuery);
  const seg = rawPath!.split("/").filter(Boolean);
  const b = body ?? {};

  const is = (...parts: (string | null)[]) =>
    parts.length === seg.length && parts.every((p, i) => p === null || p === seg[i]);

  // --- auth ---
  if (is("auth", "login") && method === "POST") {
    return { access_token: "mock-token", user: db.user };
  }

  // --- appointments ---
  if (is("appointments")) {
    if (method === "GET") {
      const status = q.get("status");
      return db.appointments
        .filter(
          (a) =>
            between(a.startAt, q.get("from"), q.get("to")) && (!status || a.status === status),
        )
        .sort((x, y) => x.startAt.localeCompare(y.startAt))
        .map(hydrateAppointment);
    }
    if (method === "POST") {
      const startAt = String(b['startAt']);
      const slot = db.slots.find((s) => s.startAt === startAt && s.isActive);
      if (slot && slot.bookedCount >= slot.capacity) {
        if (q.get("raiseCapacityIfFull") !== "true") {
          throw new MockHttpError("El horario está lleno", 409, {
            message: "El horario está lleno",
            slotFull: {
              capacity: slot.capacity,
              bookedCount: slot.bookedCount,
              suggestedCapacity: slot.capacity + 1,
            },
          });
        }
        slot.capacity += 1;
      }
      if (slot) slot.bookedCount += 1;
      const service = db.services.find((s) => s.id === b['serviceId']);
      const appt: Appointment = hydrateAppointment({
        id: newId("appt"),
        clientName: String(b['clientName'] ?? "Sin nombre"),
        clientPhone: String(b['clientPhone'] ?? ""),
        age: (b['age'] as number | null) ?? null,
        notes: (b['notes'] as string | null) ?? null,
        status: (b['status'] as Appointment["status"]) ?? "PENDING",
        startAt,
        endAt:
          (b['endAt'] as string) ??
          new Date(
            new Date(startAt).getTime() + (service?.durationMinutes ?? 60) * 60000,
          ).toISOString(),
        organizationId: ORG_ID,
        locationId: (b['locationId'] as string | null) ?? null,
        serviceId: (b['serviceId'] as string | null) ?? null,
      });
      db.appointments.push(appt);
      return appt;
    }
  }

  if (is("appointments", null)) {
    const appt = db.appointments.find((a) => a.id === seg[1]);
    if (!appt) throw new MockHttpError("Cita no encontrada", 404);
    if (method === "PATCH") return hydrateAppointment(patch(appt, b));
    if (method === "DELETE") {
      db.appointments = db.appointments.filter((a) => a.id !== appt.id);
      return null;
    }
  }

  if (is("appointments", null, "cancel") && method === "PATCH") {
    const appt = db.appointments.find((a) => a.id === seg[1]);
    if (!appt) throw new MockHttpError("Cita no encontrada", 404);
    appt.status = "CANCELLED";
    db.cancelledBy[appt.id] = q.get("by") === "CLIENT" ? "CLIENT" : "PROFESSIONAL";
    return hydrateAppointment(appt);
  }

  if (is("appointments", null, "reschedule") && method === "PATCH") {
    const appt = db.appointments.find((a) => a.id === seg[1]);
    if (!appt) throw new MockHttpError("Cita no encontrada", 404);
    const duration = new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime();
    appt.startAt = String(b['startAt'] ?? appt.startAt);
    appt.endAt = (b['endAt'] as string) ?? new Date(new Date(appt.startAt).getTime() + duration).toISOString();
    db.rescheduled[appt.id] = (db.rescheduled[appt.id] ?? 0) + 1;
    return hydrateAppointment(appt);
  }

  // --- appointment slots ---
  if (is("appointment-slots")) {
    if (method === "GET") {
      const locationId = q.get("locationId");
      return db.slots
        .filter(
          (s) =>
            between(s.startAt, q.get("from"), q.get("to")) &&
            (!locationId || s.locationId === locationId),
        )
        .sort((x, y) => x.startAt.localeCompare(y.startAt))
        .map((s) => ({ ...s, isFull: s.bookedCount >= s.capacity }));
    }
    if (method === "POST") {
      const slot: AppointmentSlot = {
        id: newId("slot"),
        organizationId: ORG_ID,
        locationId: (b['locationId'] as string | null) ?? null,
        startAt: String(b['startAt']),
        endAt: String(b['endAt'] ?? b['startAt']),
        capacity: Number(b['capacity'] ?? 1),
        bookedCount: 0,
        isActive: b['isActive'] !== false,
      };
      db.slots.push(slot);
      return slot;
    }
  }

  if (is("appointment-slots", null)) {
    const slot = db.slots.find((s) => s.id === seg[1]);
    if (!slot) throw new MockHttpError("Cupo no encontrado", 404);
    if (method === "PATCH") return patch(slot, b);
    if (method === "DELETE") {
      if (slot.bookedCount > 0) throw new MockHttpError("El cupo tiene reservas", 409);
      db.slots = db.slots.filter((s) => s.id !== slot.id);
      return null;
    }
  }

  // --- business hours ---
  if (is("business-hours")) {
    if (method === "GET")
      return [...db.businessHours].sort(
        (a, c) => a.date.localeCompare(c.date) || a.startTime.localeCompare(c.startTime),
      );
    if (method === "POST") {
      const date = String(b['date'] ?? new Date().toISOString().slice(0, 10));
      const bh: BusinessHour = {
        id: newId("bh"),
        date,
        dayOfWeek: new Date(`${date}T00:00:00`).getDay(),
        startTime: String(b['startTime'] ?? "09:00"),
        endTime: String(b['endTime'] ?? "18:00"),
        appointmentDuration: Number(b['appointmentDuration'] ?? 55),
        breakDuration: Number(b['breakDuration'] ?? 5),
        capacity: Number(b['capacity'] ?? 1),
        isActive: b['isActive'] !== false,
        organizationId: ORG_ID,
        locationId: (b['locationId'] as string | null) ?? null,
      };
      db.businessHours.push(bh);
      return bh;
    }
  }


  if (is("business-hours", null)) {
    const bh = db.businessHours.find((h) => h.id === seg[1]);
    if (!bh) throw new MockHttpError("Horario no encontrado", 404);
    if (method === "PATCH") return patch(bh, b);
    if (method === "DELETE") {
      db.businessHours = db.businessHours.filter((h) => h.id !== bh.id);
      return null;
    }
  }

  // --- events ---
  if (is("events")) {
    if (method === "GET") {
      const from = q.get("from");
      return db.events
        .filter((e) => !from || e.endAt >= from)
        .sort((a, c) => a.startAt.localeCompare(c.startAt))
        .map(hydrateEvent);
    }
    if (method === "POST") {
      const ev: ZenEvent = {
        id: newId("evt"),
        organizationId: ORG_ID,
        name: String(b['name'] ?? "Nuevo evento"),
        description: (b['description'] as string | null) ?? null,
        startAt: String(b['startAt']),
        endAt: String(b['endAt'] ?? b['startAt']),
        locationId: (b['locationId'] as string | null) ?? null,
        location: null,
        venueName: (b['venueName'] as string | null) ?? null,
        venueAddress: (b['venueAddress'] as string | null) ?? null,
        mapsLink: null,
        requirements: (b['requirements'] as string | null) ?? null,
        notes: null,
        capacity: Number(b['capacity'] ?? 10),
        bookedCount: 0,
        isActive: b['isActive'] !== false,
      };
      db.events.push(ev);
      return hydrateEvent(ev);
    }
  }

  if (is("events", null)) {
    const ev = db.events.find((e) => e.id === seg[1]);
    if (!ev) throw new MockHttpError("Evento no encontrado", 404);
    if (method === "GET") return hydrateEvent(ev);
    if (method === "PATCH") return hydrateEvent(patch(ev, b));
    if (method === "DELETE") {
      db.events = db.events.filter((e) => e.id !== ev.id);
      db.registrations = db.registrations.filter((r) => r.eventId !== ev.id);
      return null;
    }
  }

  if (is("events", null, "registrations")) {
    const ev = db.events.find((e) => e.id === seg[1]);
    if (!ev) throw new MockHttpError("Evento no encontrado", 404);
    if (method === "GET") return db.registrations.filter((r) => r.eventId === ev.id);
    if (method === "POST") {
      const confirmed = db.registrations.filter(
        (r) => r.eventId === ev.id && r.status === "CONFIRMED",
      ).length;
      if (confirmed >= ev.capacity) throw new MockHttpError("El evento está lleno", 409);
      const reg: EventRegistration = {
        id: newId("reg"),
        eventId: ev.id,
        clientName: String(b['clientName'] ?? ""),
        clientPhone: String(b['clientPhone'] ?? ""),
        notes: (b['notes'] as string | null) ?? null,
        status: "CONFIRMED",
      };
      db.registrations.push(reg);
      ev.bookedCount = confirmed + 1;
      return reg;
    }
  }

  if (is("events", null, "registrations", null, "cancel") && method === "PATCH") {
    const reg = db.registrations.find((r) => r.id === seg[3]);
    if (!reg) throw new MockHttpError("Inscripción no encontrada", 404);
    reg.status = "CANCELLED";
    const ev = db.events.find((e) => e.id === reg.eventId);
    if (ev)
      ev.bookedCount = db.registrations.filter(
        (r) => r.eventId === ev.id && r.status === "CONFIRMED",
      ).length;
    return reg;
  }

  // --- locations ---
  if (is("locations")) {
    if (method === "GET") return db.locations;
    if (method === "POST") {
      const loc: Location = {
        id: newId("loc"),
        name: String(b['name'] ?? "Nueva ubicación"),
        address: (b['address'] as string | null) ?? null,
        phone: (b['phone'] as string | null) ?? null,
        email: (b['email'] as string | null) ?? null,
        timezone: String(b['timezone'] ?? "America/Mexico_City"),
        isActive: b['isActive'] !== false,
        organizationId: ORG_ID,
      };
      db.locations.push(loc);
      return loc;
    }
  }

  if (is("locations", null)) {
    const loc = db.locations.find((l) => l.id === seg[1]);
    if (!loc) throw new MockHttpError("Ubicación no encontrada", 404);
    if (method === "PATCH") return patch(loc, b);
    if (method === "DELETE") {
      db.locations = db.locations.filter((l) => l.id !== loc.id);
      return null;
    }
  }

  // --- services ---
  if (is("services")) {
    if (method === "GET") return db.services.map(hydrateService);
    if (method === "POST") {
      const svc: Service = {
        id: newId("svc"),
        name: String(b['name'] ?? "Nuevo servicio"),
        description: (b['description'] as string | null) ?? null,
        durationMinutes: Number(b['durationMinutes'] ?? 60),
        requiredAttendees: Number(b['requiredAttendees'] ?? 1),
        isActive: b['isActive'] !== false,
        organizationId: ORG_ID,
        serviceLocations: [],
      };
      db.services.push(svc);
      return hydrateService(svc);
    }
  }

  if (is("services", null)) {
    const svc = db.services.find((s) => s.id === seg[1]);
    if (!svc) throw new MockHttpError("Servicio no encontrado", 404);
    if (method === "PATCH") return hydrateService(patch(svc, b));
    if (method === "DELETE") {
      db.services = db.services.filter((s) => s.id !== svc.id);
      db.serviceLocations = db.serviceLocations.filter((sl) => sl.serviceId !== svc.id);
      return null;
    }
  }

  // --- service locations ---
  if (is("service-locations") && method === "POST") {
    const existing = db.serviceLocations.find(
      (sl) => sl.serviceId === b['serviceId'] && sl.locationId === b['locationId'],
    );
    if (existing) return patch(existing, b);
    const sl: ServiceLocation = {
      id: newId("sl"),
      serviceId: String(b['serviceId']),
      locationId: String(b['locationId']),
      price: Number(b['price'] ?? 0),
      isAvailable: b['isAvailable'] !== false,
      description: (b['description'] as string | null) ?? null,
      durationMinutes: (b['durationMinutes'] as number | null) ?? null,
    };
    db.serviceLocations.push(sl);
    return sl;
  }

  if (is("service-locations", "by-service", null) && method === "GET") {
    return db.serviceLocations
      .filter((sl) => sl.serviceId === seg[2])
      .map(withLocation);
  }

  if (is("service-locations", null)) {
    const sl = db.serviceLocations.find((x) => x.id === seg[1]);
    if (!sl) throw new MockHttpError("Precio no encontrado", 404);
    if (method === "PATCH") return patch(sl, b);
    if (method === "DELETE") {
      db.serviceLocations = db.serviceLocations.filter((x) => x.id !== sl.id);
      return null;
    }
  }

  // --- organizations ---
  if (is("organizations", null, "context") && method === "GET") {
    return { locations: db.locations, services: db.services.map(hydrateService) };
  }

  if (is("organizations", null, "branding")) {
    if (method === "GET") return db.organization;
    if (method === "PATCH") return patch(db.organization, b);
  }

  if (is("organizations", null, "reports") && method === "GET") {
    return buildReport(q.get("from") ?? "", q.get("to") ?? "");
  }

  if (is("organizations", null)) {
    if (method === "GET") return db.organization;
    if (method === "PATCH") return patch(db.organization, b);
  }

  // --- ai settings ---
  if (is("ai-settings", "organization", null)) {
    if (method === "GET") return db.aiSettings;
    if (method === "PATCH" || method === "POST") return patch<AISettings>(db.aiSettings, b);
  }

  throw new MockHttpError(`Endpoint simulado no disponible: ${method} ${rawPath}`, 404);
}
