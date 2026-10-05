// Todas las rutas del backend que usa la app del profesional.
// REGLA: cualquier ruta que filtre o cree datos debe llevar el
// organizationId del usuario en sesión (user.organizationId). El backend
// rechaza con 403 un organizationId distinto al del token.
// Referencia completa (parámetros, validaciones, errores): API-RUTAS.md.

import { apiRequest } from './client';
import type {
  AISettings,
  AppointmentStatus,
  AppointmentWithRelations,
  AppointmentSlot,
  AuthProfile,
  AvailableSlots,
  BusinessHour,
  BusinessHourWithLocation,
  BusinessHourWithOrganization,
  Event,
  EventRegistration,
  EventWithLocation,
  FontFamily,
  FontScale,
  LocationWithOrganization,
  Location,
  LoginResponse,
  Organization,
  OrganizationContext,
  Report,
  Service,
  ServiceLocation,
  ServiceLocationLookup,
  ServiceLocationWithLocation,
  ServiceLocationWithService,
  ServiceWithRelations,
  Theme,
  Appointment,
} from './types';

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

// --- Auth --------------------------------------------------------------------

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email: email.toLowerCase().trim(), password },
      auth: false,
    }),
  me: () => apiRequest<AuthProfile>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: { currentPassword, newPassword }, // newPassword: mínimo 8 caracteres
    }),
};

// --- Organización ------------------------------------------------------------

export interface UpdateBrandingInput {
  theme?: Theme;
  logoUrl?: string | null; // solo la URL (png, jpg, jpeg, svg, webp; máx. 512 KB)
  primaryColor?: string | null; // "#RRGGBB"
  secondaryColor?: string | null;
  fontFamily?: FontFamily | null;
  fontScale?: FontScale;
}

export interface UpdateCancellationPolicyInput {
  allowClientCancellation?: boolean;
  cancellationDeadlineHours?: number | null;
  hasCancellationPenalty?: boolean;
  cancellationPenaltyText?: string | null;
}

export const organizationApi = {
  get: (orgId: string) => apiRequest<Organization>(`/organizations/${orgId}`),
  /** Sedes, servicios con precios, horarios, IA, branding y políticas en una sola llamada. */
  context: (orgId: string) => apiRequest<OrganizationContext>(`/organizations/${orgId}/context`),
  updateBranding: (orgId: string, data: UpdateBrandingInput) =>
    apiRequest<Organization>(`/organizations/${orgId}/branding`, { method: 'PATCH', body: data }),
  updateCancellationPolicy: (orgId: string, data: UpdateCancellationPolicyInput) =>
    apiRequest<Organization>(`/organizations/${orgId}`, { method: 'PATCH', body: data }),
};

// --- Reportes ------------------------------------------------------------------

export const reportsApi = {
  /** from/to en ISO; sin fechas el backend usa los últimos 30 días. */
  get: (orgId: string, from?: string, to?: string) =>
    apiRequest<Report>(`/organizations/${orgId}/reports${qs({ from, to })}`),
};

// --- Citas ---------------------------------------------------------------------

export interface ListAppointmentsParams {
  organizationId: string;
  from?: string; // ISO
  to?: string; // ISO
  status?: AppointmentStatus[]; // sin status: todas
  clientPhone?: string;
}

export interface CreateAppointmentInput {
  organizationId: string;
  clientName: string;
  clientPhone: string;
  age?: number; // 0–150
  notes?: string;
  locationId: string;
  serviceId: string;
  startAt: string; // ISO; debe coincidir con un cupo (AppointmentSlot) activo
  endAt: string;
}

export const appointmentsApi = {
  /** Ordenadas por startAt ascendente. */
  list: ({ status, ...p }: ListAppointmentsParams) =>
    apiRequest<AppointmentWithRelations[]>(
      `/appointments${qs({ ...p, status: status?.join(',') })}`,
    ),
  get: (id: string) => apiRequest<AppointmentWithRelations>(`/appointments/${id}`),
  /**
   * 409 con cuerpo SlotFullError si el horario está lleno: ofrecer
   * "agendar de todos modos" y reintentar con raiseCapacityIfFull = true.
   */
  create: (data: CreateAppointmentInput, raiseCapacityIfFull = false) =>
    apiRequest<Appointment>(`/appointments${raiseCapacityIfFull ? '?raiseCapacityIfFull=true' : ''}`, {
      method: 'POST',
      body: data,
    }),
  cancel: (id: string, reason?: string) =>
    apiRequest<Appointment>(`/appointments/${id}/cancel?by=PROFESSIONAL`, {
      method: 'PATCH',
      body: { reason },
    }),
  /** Solo citas PENDING o CONFIRMED. */
  reschedule: (id: string, data: { startAt: string; endAt: string; locationId?: string | null }) =>
    apiRequest<Appointment>(`/appointments/${id}/reschedule?by=PROFESSIONAL`, {
      method: 'PATCH',
      body: data,
    }),
  /**
   * ASISTIO / NO_ASISTIO / REAGENDADA solo sobre citas PENDING o CONFIRMED.
   * CANCELLED no se permite aquí (usar cancel).
   */
  setStatus: (id: string, status: Exclude<AppointmentStatus, 'CANCELLED'>) =>
    apiRequest<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
};

// --- Sedes ---------------------------------------------------------------------

export interface CreateLocationInput {
  organizationId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  mapsUrl?: string; // URL válida
  timezone?: string;
  isActive?: boolean;
}

export type UpdateLocationInput = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  mapsUrl?: string | null;
  timezone?: string;
  isActive?: boolean;
};

export const locationsApi = {
  list: (orgId: string) => apiRequest<LocationWithOrganization[]>(`/locations${qs({ organizationId: orgId })}`),
  get: (id: string) => apiRequest<LocationWithOrganization>(`/locations/${id}`),
  create: (data: CreateLocationInput) => apiRequest<Location>('/locations', { method: 'POST', body: data }),
  update: (id: string, data: UpdateLocationInput) =>
    apiRequest<Location>(`/locations/${id}`, { method: 'PATCH', body: data }),
};

// --- Servicios y precios por sede ------------------------------------------------

export interface CreateServiceInput {
  organizationId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  requiredAttendees?: number; // ≥ 1
  basePrice?: number;
  isActive?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  requiredAttendees?: number;
  basePrice?: number | null;
  isActive?: boolean;
  overrideCancellationPolicy?: boolean;
  allowClientCancellation?: boolean;
  cancellationDeadlineHours?: number | null;
  hasCancellationPenalty?: boolean;
  cancellationPenaltyText?: string | null;
}

export interface ServiceLocationInput {
  price?: number;
  isAvailable?: boolean;
  description?: string;
  durationMinutes?: number;
}

export const servicesApi = {
  list: (orgId: string) => apiRequest<ServiceWithRelations[]>(`/services${qs({ organizationId: orgId })}`),
  get: (id: string) => apiRequest<ServiceWithRelations>(`/services/${id}`),
  create: (data: CreateServiceInput) => apiRequest<Service>('/services', { method: 'POST', body: data }),
  update: (id: string, data: UpdateServiceInput) =>
    apiRequest<Service>(`/services/${id}`, { method: 'PATCH', body: data }),
};

export const serviceLocationsApi = {
  byService: (serviceId: string) =>
    apiRequest<ServiceLocationWithLocation[]>(`/service-locations/by-service/${serviceId}`),
  byLocation: (locationId: string) =>
    apiRequest<ServiceLocationWithService[]>(`/service-locations/by-location/${locationId}`),
  lookup: (serviceId: string, locationId: string) =>
    apiRequest<ServiceLocationLookup>(`/service-locations/lookup${qs({ serviceId, locationId })}`),
  create: (data: { serviceId: string; locationId: string; price: number } & ServiceLocationInput) =>
    apiRequest<ServiceLocation>('/service-locations', { method: 'POST', body: data }),
  update: (id: string, data: ServiceLocationInput) =>
    apiRequest<ServiceLocation>(`/service-locations/${id}`, { method: 'PATCH', body: data }),
};

// --- Horarios de atención --------------------------------------------------------

export interface CreateBusinessHourInput {
  organizationId: string;
  dayOfWeek: number; // 0 = domingo … 6 = sábado
  startTime: string; // "HH:MM"
  endTime: string;
  appointmentDuration: number; // ≥ 1
  breakDuration: number; // ≥ 0
  locationId?: string; // sin sede = todas
  isActive?: boolean;
}

export type UpdateBusinessHourInput = Partial<Omit<CreateBusinessHourInput, 'organizationId' | 'locationId'>> & {
  locationId?: string | null;
};

export const businessHoursApi = {
  list: (orgId: string, params: { locationId?: string; dayOfWeek?: number } = {}) =>
    apiRequest<BusinessHourWithLocation[]>(`/business-hours${qs({ organizationId: orgId, ...params })}`),
  get: (id: string) => apiRequest<BusinessHourWithOrganization>(`/business-hours/${id}`),
  create: (data: CreateBusinessHourInput) =>
    apiRequest<BusinessHour>('/business-hours', { method: 'POST', body: data }),
  update: (id: string, data: UpdateBusinessHourInput) =>
    apiRequest<BusinessHour>(`/business-hours/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<BusinessHour>(`/business-hours/${id}`, { method: 'DELETE' }),
  /** Copia un bloque (sourceId) a otros días; replace = true sustituye lo que haya en esos días. */
  replicate: (data: { sourceId: string; days: number[]; replace?: boolean }) =>
    apiRequest<BusinessHour[]>('/business-hours/replicate', { method: 'POST', body: data }),
};

// --- Cupos ---------------------------------------------------------------------

export const appointmentSlotsApi = {
  list: (p: { organizationId: string; locationId?: string; from?: string; to?: string }) =>
    apiRequest<AppointmentSlot[]>(`/appointment-slots${qs(p)}`),
  /** Horarios libres agrupados por día (from = "YYYY-MM-DD", days = cuántos días). */
  available: (p: { organizationId: string; locationId: string; serviceId?: string; from?: string; days?: number; date?: string }) =>
    apiRequest<AvailableSlots>(`/appointment-slots/available${qs(p)}`),
  create: (data: {
    organizationId: string;
    locationId: string;
    startAt: string;
    endAt: string;
    capacity?: number; // ≥ 1
    isActive?: boolean;
  }) => apiRequest<AppointmentSlot>('/appointment-slots', { method: 'POST', body: data }),
  update: (id: string, data: { capacity?: number; isActive?: boolean }) =>
    apiRequest<AppointmentSlot>(`/appointment-slots/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<AppointmentSlot>(`/appointment-slots/${id}`, { method: 'DELETE' }),
};

// --- Eventos / talleres ------------------------------------------------------------

export interface CreateEventInput {
  organizationId: string;
  name: string;
  startAt: string;
  endAt: string;
  capacity: number; // ≥ 1
  description?: string;
  locationId?: string;
  venueName?: string;
  venueAddress?: string;
  mapsLink?: string; // URL válida
  requirements?: string;
  notes?: string;
  isActive?: boolean;
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'organizationId'>>;

export const eventsApi = {
  list: (p: { organizationId: string; from?: string; to?: string; activeOnly?: boolean }) =>
    apiRequest<Event[]>(`/events${qs(p)}`),
  get: (id: string) => apiRequest<EventWithLocation>(`/events/${id}`),
  create: (data: CreateEventInput) => apiRequest<Event>('/events', { method: 'POST', body: data }),
  update: (id: string, data: UpdateEventInput) =>
    apiRequest<Event>(`/events/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<Event>(`/events/${id}`, { method: 'DELETE' }),
  registrations: (eventId: string) =>
    apiRequest<EventRegistration[]>(`/events/${eventId}/registrations`),
  register: (eventId: string, data: { clientName: string; clientPhone: string; notes?: string }) =>
    apiRequest<EventRegistration>(`/events/${eventId}/registrations`, { method: 'POST', body: data }),
  cancelRegistration: (eventId: string, regId: string) =>
    apiRequest<EventRegistration>(`/events/${eventId}/registrations/${regId}/cancel`, { method: 'PATCH' }),
};

// --- Asistente IA de WhatsApp --------------------------------------------------------

export type UpdateAISettingsInput = Partial<
  Pick<
    AISettings,
    | 'enabled'
    | 'assistantName'
    | 'systemPrompt'
    | 'tone'
    | 'welcomeMessage'
    | 'sendWelcomeOnFirstMessage'
    | 'fallbackMessage'
    | 'formatWhatsappText'
    | 'whatsappFormattingHints'
    | 'temperature'
    | 'maxTokens'
    | 'allowHumanTakeover'
  >
>;

export const aiSettingsApi = {
  /** null si la organización aún no tiene configuración guardada. */
  get: (orgId: string) => apiRequest<AISettings | null>(`/ai-settings/organization/${orgId}`),
  /** Crea o actualiza (upsert). Mandar solo los campos que cambian; assistantName no puede ser null. */
  update: (orgId: string, data: UpdateAISettingsInput) =>
    apiRequest<AISettings>(`/ai-settings/organization/${orgId}`, { method: 'PATCH', body: data }),
};
