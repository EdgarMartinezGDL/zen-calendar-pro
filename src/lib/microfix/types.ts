// Tipos de la API de MicroFix Cloud (backend NestJS).
//
// Validados contra respuestas REALES del backend con
// integracion-lovable/validacion/validar.cjs: cada ejemplo de
// integracion-lovable/ejemplos/ se compila contra estos tipos como objeto
// literal, así que un campo de más, de menos o con otro tipo rompe la
// validación. Fechas: siempre ISO 8601 en UTC (string).

// --- Enums -------------------------------------------------------------------

export type UserRole = 'SUPER_ADMIN' | 'PROFESSIONAL' | 'ASSISTANT';

export type AppointmentStatus =
  | 'PENDING' // pendiente (estado con el que nace)
  | 'CONFIRMED'
  | 'CANCELLED' // solo vía PATCH /appointments/:id/cancel
  | 'COMPLETED'
  | 'ASISTIO' // el paciente asistió (suma a ingresos del reporte)
  | 'NO_ASISTIO'
  | 'REAGENDADA';

export type CancelledBy = 'CLIENT' | 'PROFESSIONAL';

export type EventRegistrationStatus = 'CONFIRMED' | 'CANCELLED';

export type Theme = 'light' | 'dark' | 'auto';
export type FontScale = 'sm' | 'md' | 'lg';
export type FontFamily = 'System' | 'Inter' | 'Roboto' | 'Open Sans' | 'Lato' | 'Poppins';

// --- Auth --------------------------------------------------------------------

/** Usuario que devuelve POST /auth/login (se guarda en localStorage). */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface LoginResponse {
  access_token: string; // JWT, vence en 8 h
  user: AuthUser;
}

/** GET /auth/me */
export interface AuthProfile extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

// --- Organización ------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  allowClientCancellation: boolean;
  cancellationDeadlineHours: number | null;
  hasCancellationPenalty: boolean;
  cancellationPenaltyText: string | null;
  theme: Theme;
  logoUrl: string | null;
  primaryColor: string | null; // "#RRGGBB"
  secondaryColor: string | null;
  fontFamily: FontFamily | null;
  fontScale: FontScale;
  createdAt: string;
  updatedAt: string;
}

export interface CancellationPolicy {
  allowClientCancellation: boolean;
  cancellationDeadlineHours: number | null;
  hasCancellationPenalty: boolean;
  cancellationPenaltyText: string | null;
}

// --- Sedes (Location) ----------------------------------------------------------

export interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  mapsUrl: string | null;
  timezone: string; // p. ej. "America/Mexico_City"
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /locations y GET /locations/:id */
export interface LocationWithOrganization extends Location {
  organization: Organization;
}

// --- Servicios -----------------------------------------------------------------

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  requiredAttendees: number;
  basePrice: number | null; // precio de respaldo si la sede no define uno
  overrideCancellationPolicy: boolean;
  allowClientCancellation: boolean;
  cancellationDeadlineHours: number | null;
  hasCancellationPenalty: boolean;
  cancellationPenaltyText: string | null;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/** Precio/disponibilidad de un servicio en una sede (fuente principal del precio). */
export interface ServiceLocation {
  id: string;
  serviceId: string;
  locationId: string;
  isAvailable: boolean;
  price: number;
  description: string | null;
  durationMinutes: number | null; // null = usa la duración del servicio
  createdAt: string;
  updatedAt: string;
}

/** GET /services y GET /services/:id */
export interface ServiceWithRelations extends Service {
  organization: Organization;
  serviceLocations: ServiceLocation[];
}

/** GET /service-locations/by-service/:serviceId */
export interface ServiceLocationWithLocation extends ServiceLocation {
  location: Location;
}

/** GET /service-locations/by-location/:locationId */
export interface ServiceLocationWithService extends ServiceLocation {
  service: Service;
}

/** GET /service-locations/lookup?serviceId=&locationId= */
export interface ServiceLocationLookup {
  serviceId: string;
  locationId: string;
  serviceName: string;
  locationName: string;
  isAvailable: boolean;
  price: number;
  description: string | null;
  durationMinutes: number;
}

// --- Contexto de la organización (todo en una llamada) -------------------------

export interface ContextService extends Service {
  serviceLocations: ServiceLocation[];
  effectiveCancellationPolicy: CancellationPolicy;
}

export interface ContextAISettings {
  enabled: boolean;
  assistantName: string;
  tone: string | null;
  welcomeMessage: string | null;
  sendWelcomeOnFirstMessage: boolean;
  fallbackMessage: string | null;
  formatWhatsappText: boolean;
  whatsappFormattingHints: string | null;
  allowHumanTakeover: boolean;
}

export interface ContextBusinessHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  appointmentDuration: number;
  breakDuration: number;
  locationId: string | null;
}

/** Horarios llenos o desactivados de los próximos 30 días. */
export interface ContextUnavailableSlot {
  locationId: string | null;
  startAt: string;
  endAt: string;
  reason: 'full' | 'inactive';
}

/** Eventos activos con cupo de los próximos 60 días. */
export interface ContextEvent {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: { id: string; name: string } | null;
  venueName: string | null;
  venueAddress: string | null;
  mapsLink: string | null;
  requirements: string | null;
  notes: string | null;
  spotsLeft: number;
}

/** GET /organizations/:id/context */
export interface OrganizationContext extends Organization {
  locations: Location[];
  services: ContextService[];
  ai: ContextAISettings; // con valores por defecto si la org no tiene configuración
  branding: {
    theme: Theme;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    fontFamily: FontFamily | null;
    fontScale: FontScale;
    logoConstraints: { maxBytes: number; allowedFormats: string[] };
  };
  cancellationPolicy: CancellationPolicy;
  businessHours: ContextBusinessHour[];
  unavailableSlots: ContextUnavailableSlot[];
  events: ContextEvent[];
}

// --- Citas ---------------------------------------------------------------------

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  age: number | null;
  notes: string | null;
  metadata: Record<string, unknown> | null; // p. ej. { motivo: "..." } desde WhatsApp
  status: AppointmentStatus;
  cancelledAt: string | null;
  cancelledBy: CancelledBy | null;
  cancellationReason: string | null;
  rescheduleCount: number;
  startAt: string;
  endAt: string;
  organizationId: string;
  locationId: string | null;
  serviceId: string | null;
  slotId: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  professionalId: string | null;
  patientId: string | null;
}

/** GET /appointments y GET /appointments/:id */
export interface AppointmentWithRelations extends Appointment {
  organization: Organization;
  location: Location | null;
  service: Service | null;
}

/** Cuerpo del 409 de POST /appointments cuando el horario está lleno. */
export interface SlotFullError {
  statusCode: 409;
  error: 'Conflict';
  message: string;
  slotFull: { capacity: number; bookedCount: number; suggestedCapacity: number };
}

// --- Horarios de atención ------------------------------------------------------

export interface BusinessHour {
  id: string;
  dayOfWeek: number; // 0 = domingo … 6 = sábado
  startTime: string; // "HH:MM"
  endTime: string;
  appointmentDuration: number; // minutos
  breakDuration: number; // minutos
  isActive: boolean;
  organizationId: string;
  locationId: string | null; // null = aplica a todas las sedes
  createdAt: string;
  updatedAt: string;
}

/** GET /business-hours?organizationId= */
export interface BusinessHourWithLocation extends BusinessHour {
  location: Location | null;
}

/** GET /business-hours/:id */
export interface BusinessHourWithOrganization extends BusinessHour {
  organization: Organization;
  location: Location | null;
}

// --- Cupos (AppointmentSlot) ---------------------------------------------------

export interface AppointmentSlot {
  id: string;
  organizationId: string;
  locationId: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isFull: boolean;
}

/** GET /appointment-slots/available */
export interface AvailableSlots {
  locationId: string;
  from: string; // "YYYY-MM-DD"
  upcoming: {
    date: string; // "YYYY-MM-DD"
    slots: { startAt: string; endAt: string; spotsLeft: number }[];
  }[];
}

// --- Eventos -------------------------------------------------------------------

export interface Event {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  locationId: string | null;
  venueName: string | null;
  venueAddress: string | null;
  mapsLink: string | null;
  requirements: string | null;
  notes: string | null;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isFull: boolean;
}

/** GET /events/:id */
export interface EventWithLocation extends Event {
  location: Location | null;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  clientName: string;
  clientPhone: string;
  notes: string | null;
  status: EventRegistrationStatus;
  createdAt: string;
  updatedAt: string;
}

// --- IA (asistente de WhatsApp) -------------------------------------------------

export interface AISettings {
  id: string;
  enabled: boolean;
  assistantName: string;
  systemPrompt: string | null;
  tone: string | null;
  welcomeMessage: string | null;
  sendWelcomeOnFirstMessage: boolean;
  fallbackMessage: string | null;
  formatWhatsappText: boolean;
  whatsappFormattingHints: string | null;
  temperature: number;
  maxTokens: number;
  allowHumanTakeover: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// --- Reportes ------------------------------------------------------------------

/** GET /organizations/:id/reports?from=&to= (sin fechas: últimos 30 días) */
export interface Report {
  range: { from: string; to: string };
  appointments: {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    cancelled: {
      total: number;
      byWho: { CLIENT: number; PROFESSIONAL: number; UNKNOWN: number };
    };
    rescheduled: { appointments: number; totalReschedules: number };
  };
  topServices: { serviceId: string | null; name: string | null; count: number }[];
  slotOccupancy: { totalCapacity: number; totalBooked: number; rate: number };
  events: { total: number; registrations: { total: number; cancelled: number } };
  revenue: { total: number }; // suma del precio de las citas ASISTIO del rango
}

// --- Errores -------------------------------------------------------------------

/** Forma estándar de error de NestJS (message es un arreglo si falla la validación). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
