export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export type AdminReservation = {
  id: string;
  time: string;
  duration: number;
  customer: string;
  phone: string;
  email?: string;
  partySize: number;
  adults: number;
  children: number;
  table: string | null;
  area: 'Terraza' | 'Interior' | 'Barra';
  status: ReservationStatus;
  source: 'website' | 'phone' | 'walk_in' | 'admin' | 'instagram' | 'google' | 'other';
  notes?: string;
  preferences?: string;
  internalNotes?: string;
  allergies?: string;
  visits: number;
  serviceId?: string;
  serviceName?: string;
  startsAt?: string;
  endsAt?: string;
  tableIds?: string[];
  customerId?: string | null;
  confirmationCode?: string;
};

export type DiningTable = {
  id: string;
  label: string;
  seats: number;
  area: 'Terraza' | 'Interior' | 'Barra';
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'round' | 'rect';
  state: 'free' | 'reserved' | 'seated' | 'blocked';
  reservationId?: string;
  areaId?: string;
  minSeats?: number;
  blockedReason?: string | null;
  blockedServiceIds?: string[];
};

export type AdminService = {
  id: string;
  name: string;
  slug: string;
  defaultDuration: number;
  openTime: string | null;
  closeTime: string | null;
};

export type TableCombination = {
  id: string;
  name: string;
  tableIds: string[];
  minCapacity: number;
  maxCapacity: number;
};

export type FloorSnapshot = {
  date: string;
  generatedAt: string;
  services: AdminService[];
  tables: DiningTable[];
  reservations: AdminReservation[];
  combinations: TableCombination[];
};

export type StaffSession = {
  id: string;
  email: string;
  fullName: string;
  role: 'manager' | 'host' | 'editor' | 'viewer';
};

export type CustomerSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferences: string | null;
  allergies: string | null;
  internalNotes: string | null;
  totalReservations: number;
  completedVisits: number;
  cancellations: number;
  noShows: number;
  activeReservations: number;
  totalCovers: number;
  typicalPartySize: number | null;
  firstVisit: string | null;
  lastVisit: string | null;
};

export type CustomerReservationHistory = {
  id: string;
  startsAt: string;
  partySize: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  source: AdminReservation['source'];
  serviceName: string | null;
  notes: string | null;
  allergies: string | null;
  preferences: string | null;
  internalNotes: string | null;
};

export type CustomerDetail = CustomerSummary & {
  createdAt: string;
  history: CustomerReservationHistory[];
};

export type WaitlistStatus = 'waiting' | 'offered' | 'converted' | 'expired' | 'cancelled';

export type AdminWaitlistItem = {
  id: string;
  customerId: string | null;
  customerName: string;
  phone: string | null;
  email: string | null;
  serviceName: string | null;
  desiredDate: string;
  adults: number;
  children: number;
  partySize: number;
  preferredTime: string | null;
  flexibleFrom: string | null;
  flexibleTo: string | null;
  status: WaitlistStatus;
  offeredAt: string | null;
  offerExpiresAt: string | null;
  convertedReservationId: string | null;
  createdAt: string;
};

export type AvailabilityRule = {
  id: string;
  serviceId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  maxCovers: number | null;
  minNoticeMinutes: number;
  bookingHorizonDays: number;
  minPartySize: number;
  maxPartySize: number;
  active: boolean;
};

export type OperationalService = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  autoConfirm: boolean;
  defaultDurationMinutes: number;
  rules: AvailabilityRule[];
};

export type OperationalSettings = {
  services: OperationalService[];
  counts: { areas: number; tables: number; combinations: number; users: number; closures: number };
};
