import type {
  AISettings,
  Appointment,
  AppointmentSlot,
  AuthUser,
  BusinessHour,
  Event as ZenEvent,
  EventRegistration,
  Location,
  Organization,
  Service,
  ServiceLocation,
} from "@/types";

export const ORG_ID = "org-zen-1";

const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

const day = (offset: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const plus = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60000).toISOString();

export interface MockDb {
  user: AuthUser;
  organization: Organization;
  locations: Location[];
  services: Service[];
  serviceLocations: ServiceLocation[];
  businessHours: BusinessHour[];
  slots: AppointmentSlot[];
  appointments: Appointment[];
  events: ZenEvent[];
  registrations: EventRegistration[];
  aiSettings: AISettings;
  cancelledBy: Record<string, "CLIENT" | "PROFESSIONAL">;
  rescheduled: Record<string, number>;
}

function seed(): MockDb {
  const locations: Location[] = [
    {
      id: "loc-1",
      name: "Consultorio Centro",
      address: "Av. Reforma 245, Col. Juárez",
      mapsUrl: "https://maps.app.goo.gl/ejemplo-centro",
      phone: "55 1234 5678",
      email: "centro@miagendazen.mx",
      timezone: "America/Mexico_City",
      isActive: true,
      organizationId: ORG_ID,
    },
    {
      id: "loc-2",
      name: "Clínica Sur",
      address: "Calz. de Tlalpan 1820",
      phone: "55 8765 4321",
      email: "sur@miagendazen.mx",
      timezone: "America/Mexico_City",
      isActive: true,
      organizationId: ORG_ID,
    },
  ];

  const serviceLocations: ServiceLocation[] = [
    { id: "sl-1", serviceId: "svc-1", locationId: "loc-1", price: 900, isAvailable: true, description: null, durationMinutes: 60, location: { id: "loc-1", name: locations[0]!.name } },
    { id: "sl-2", serviceId: "svc-1", locationId: "loc-2", price: 750, isAvailable: true, description: null, durationMinutes: 60, location: { id: "loc-2", name: locations[1]!.name } },
    { id: "sl-3", serviceId: "svc-2", locationId: "loc-1", price: 1200, isAvailable: true, description: null, durationMinutes: 90, location: { id: "loc-1", name: locations[0]!.name } },
    { id: "sl-4", serviceId: "svc-3", locationId: "loc-2", price: 550, isAvailable: true, description: null, durationMinutes: 45, location: { id: "loc-2", name: locations[1]!.name } },
  ];

  const services: Service[] = [
    {
      id: "svc-1",
      name: "Consulta individual",
      description: "Sesión uno a uno de seguimiento.",
      durationMinutes: 60,
      requiredAttendees: 1,
      isActive: true,
      organizationId: ORG_ID,
      serviceLocations: serviceLocations.filter((s) => s.serviceId === "svc-1"),
    },
    {
      id: "svc-2",
      name: "Terapia de pareja",
      description: "Sesión conjunta de 90 minutos.",
      durationMinutes: 90,
      requiredAttendees: 2,
      isActive: true,
      organizationId: ORG_ID,
      serviceLocations: serviceLocations.filter((s) => s.serviceId === "svc-2"),
    },
    {
      id: "svc-3",
      name: "Sesión de respiración",
      description: "Práctica guiada de relajación.",
      durationMinutes: 45,
      requiredAttendees: 1,
      isActive: true,
      organizationId: ORG_ID,
      serviceLocations: serviceLocations.filter((s) => s.serviceId === "svc-3"),
    },
  ];

  const ymd = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const businessHours: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6]
    .map((offset): BusinessHour | null => {
      const date = ymd(offset);
      const dow = new Date(`${date}T00:00:00`).getDay();
      if (dow === 0) return null;
      return {
        id: `bh-${date}`,
        date,
        dayOfWeek: dow,
        startTime: "09:00",
        endTime: dow === 6 ? "14:00" : "18:00",
        appointmentDuration: 55,
        breakDuration: 5,
        capacity: 1,
        isActive: true,
        organizationId: ORG_ID,
        locationId: dow % 2 === 0 ? "loc-2" : "loc-1",
      };
    })
    .filter((h): h is BusinessHour => h !== null);

  const slots: AppointmentSlot[] = [];
  for (let d = -10; d < 14; d++) {
    for (const h of [9, 11, 13, 16]) {
      const startAt = day(d, h);
      slots.push({
        id: `slot-${d}-${h}`,
        organizationId: ORG_ID,
        locationId: h % 2 === 0 ? "loc-2" : "loc-1",
        startAt,
        endAt: plus(startAt, 60),
        capacity: 3,
        bookedCount: d < 0 ? (h % 3 === 0 ? 3 : 2) : d === 0 && h < 13 ? 2 : d % 3 === 0 ? 1 : 0,
        isActive: !(d === 4 && h === 16),
      });
    }
  }

  const mkAppt = (
    n: string,
    phone: string,
    offset: number,
    hour: number,
    status: Appointment["status"],
    serviceIdx: number,
    locIdx: number,
    age: number | null,
    notes: string | null,
  ): Appointment => {
    const startAt = day(offset, hour);
    const svc = services[serviceIdx]!;
    const loc = locations[locIdx]!;
    return {
      id: id("appt"),
      clientName: n,
      clientPhone: phone,
      age,
      notes,
      status,
      startAt,
      endAt: plus(startAt, svc.durationMinutes),
      organizationId: ORG_ID,
      locationId: loc.id,
      serviceId: svc.id,
      location: { id: loc.id, name: loc.name },
      service: { id: svc.id, name: svc.name },
    };
  };

  const appointments: Appointment[] = [
    mkAppt("Ana Ruiz", "55 1111 2222", 0, 9, "CONFIRMED", 0, 0, 34, "Primera sesión del mes."),
    mkAppt("Luis Herrera", "55 3333 4444", 0, 11, "PENDING", 2, 1, 41, null),
    mkAppt("Marta y Diego", "55 5555 6666", 0, 13, "CONFIRMED", 1, 0, null, "Traen ejercicio de casa."),
    mkAppt("Sofía Márquez", "55 7777 8888", 0, 16, "CANCELLED", 0, 1, 28, "Canceló por trabajo."),
    mkAppt("Pedro Nava", "55 9999 0000", 1, 10, "CONFIRMED", 0, 0, 52, null),
    mkAppt("Carla Vidal", "55 2222 3333", 1, 12, "PENDING", 2, 1, 23, null),
    mkAppt("Jorge Lima", "55 4444 5555", 2, 9, "CONFIRMED", 1, 0, 38, null),
    mkAppt("Elena Prado", "55 6666 7777", -1, 9, "COMPLETED", 0, 0, 45, null),
    mkAppt("Raúl Ortiz", "55 8888 9999", -1, 11, "COMPLETED", 2, 1, 31, null),
    mkAppt("Nadia Solís", "55 1212 3434", -2, 10, "COMPLETED", 0, 1, 27, null),
    mkAppt("Iván Castro", "55 5656 7878", -3, 16, "CANCELLED", 1, 0, 36, null),
    mkAppt("Paula Reyes", "55 9090 1010", -5, 13, "COMPLETED", 0, 0, 49, null),
  ];

  const events: ZenEvent[] = [
    {
      id: "evt-1",
      organizationId: ORG_ID,
      name: "Taller de manejo del estrés",
      description: "Cuatro horas de técnicas prácticas.",
      startAt: day(5, 10),
      endAt: day(5, 14),
      locationId: "loc-1",
      location: { id: "loc-1", name: locations[0]!.name },
      venueName: "Sala Zen",
      venueAddress: "Av. Reforma 245",
      mapsLink: null,
      requirements: "Ropa cómoda y libreta.",
      notes: null,
      capacity: 12,
      bookedCount: 3,
      isActive: true,
    },
    {
      id: "evt-2",
      organizationId: ORG_ID,
      name: "Círculo de meditación",
      description: "Sesión grupal mensual.",
      startAt: day(9, 18),
      endAt: day(9, 20),
      locationId: "loc-2",
      location: { id: "loc-2", name: locations[1]!.name },
      venueName: "Terraza Sur",
      venueAddress: "Calz. de Tlalpan 1820",
      mapsLink: null,
      requirements: null,
      notes: null,
      capacity: 2,
      bookedCount: 2,
      isActive: true,
    },
    {
      id: "evt-3",
      organizationId: ORG_ID,
      name: "Introducción al mindfulness",
      description: "Edición pausada temporalmente.",
      startAt: day(20, 11),
      endAt: day(20, 13),
      locationId: null,
      location: null,
      venueName: "Por definir",
      venueAddress: null,
      mapsLink: null,
      requirements: null,
      notes: null,
      capacity: 20,
      bookedCount: 0,
      isActive: false,
    },
  ];

  events.push({
    id: "evt-0",
    organizationId: ORG_ID,
    name: "Retiro de fin de semana",
    description: "Edición pasada, ya realizada.",
    startAt: day(-8, 9),
    endAt: day(-8, 17),
    locationId: "loc-1",
    location: { id: "loc-1", name: locations[0]!.name },
    venueName: "Sala Zen",
    venueAddress: "Av. Reforma 245",
    mapsLink: null,
    requirements: null,
    notes: null,
    capacity: 15,
    bookedCount: 2,
    isActive: true,
  });

  const registrations: EventRegistration[] = [
    { id: "reg-1", eventId: "evt-1", clientName: "Ana Ruiz", clientPhone: "55 1111 2222", notes: null, status: "CONFIRMED" },
    { id: "reg-2", eventId: "evt-1", clientName: "Luis Herrera", clientPhone: "55 3333 4444", notes: null, status: "CONFIRMED" },
    { id: "reg-3", eventId: "evt-1", clientName: "Carla Vidal", clientPhone: "55 2222 3333", notes: null, status: "CONFIRMED" },
    { id: "reg-4", eventId: "evt-1", clientName: "Iván Castro", clientPhone: "55 5656 7878", notes: null, status: "CANCELLED" },
    { id: "reg-5", eventId: "evt-2", clientName: "Marta Solano", clientPhone: "55 4141 5151", notes: null, status: "CONFIRMED" },
    { id: "reg-0a", eventId: "evt-0", clientName: "Elena Prado", clientPhone: "55 6666 7777", notes: null, status: "CONFIRMED" },
    { id: "reg-0b", eventId: "evt-0", clientName: "Raúl Ortiz", clientPhone: "55 8888 9999", notes: null, status: "CONFIRMED" },
    { id: "reg-6", eventId: "evt-2", clientName: "Diego Fuentes", clientPhone: "55 6161 7171", notes: null, status: "CONFIRMED" },
  ];

  return {
    user: {
      id: "user-1",
      fullName: "Dra. Valeria Cordero",
      email: "demo@miagendazen.mx",
      role: "PROFESSIONAL",
      organizationId: ORG_ID,
    },
    organization: {
      id: ORG_ID,
      name: "Mi Agenda Zen",
      slug: "mi-agenda-zen",
      allowClientCancellation: true,
      cancellationDeadlineHours: 24,
      hasCancellationPenalty: false,
      cancellationPenaltyText: null,
      theme: "auto",
      logoUrl: null,
      primaryColor: "#0F766E",
      secondaryColor: "#D97706",
      fontFamily: "Plus Jakarta Sans",
      fontScale: "md",
    },
    locations,
    services,
    serviceLocations,
    businessHours,
    slots,
    appointments,
    events,
    registrations,
    aiSettings: {
      id: "ai-1",
      organizationId: ORG_ID,
      enabled: true,
      assistantName: "Zen",
      tone: "Cálido y profesional",
      welcomeMessage: "Hola, soy Zen. ¿En qué te puedo ayudar con tu cita?",
      sendWelcomeOnFirstMessage: true,
      fallbackMessage: "Déjame consultarlo y te confirmo en un momento.",
      formatWhatsappText: true,
      whatsappFormattingHints: "Usa *negritas* para las horas.",
      allowHumanTakeover: true,
    },
    cancelledBy: {},
    rescheduled: {},
  };
}

export const db: MockDb = seed();
export const newId = id;
