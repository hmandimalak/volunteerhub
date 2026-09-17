export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Event = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  address?: string;
  city: string;
  country: string;
  status: string;
  category?: number;
  organisation?: number;
  volunteers_needed: number;
  organisation_name?: string;
  category_name?: string;
  missions?: Mission[];
  registered_volunteers_count: number;
};

export type Mission = {
  id: number;
  name: string;
  description: string;
  capacity: number;
  remaining_places: number;
  registered_volunteers_count?: number;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type PlatformStats = {
  volunteers: number;
  verified_organisations: number;
  active_events: number;
  volunteer_hours: number;
  completed_events: number;
};

export type VolunteerQrCode = {
  application_id: number;
  event_title: string;
  mission_name: string;
  event_date: string;
  city: string;
  qr_token: string;
  attendance_status: string;
  arrived_at: string | null;
};

export type MissionRecommendation = {
  mission: Mission;
  event: Event;
  score: number;
  reasons: string[];
};

export type EventCategory = {
  id: number;
  name: string;
  icon: string;
  color: string;
  active: boolean;
};

export type Skill = {
  id: number;
  name: string;
  category: string;
};

export type EventDetails = {
  event: Event;
  missions: Mission[];
  registered_volunteers: number;
  attendance_stats: {
    confirmed: number;
    attended: number;
    absent: number;
    completed: number;
    attendance_rate: number;
  };
};

export type Badge = {
  id: number;
  name: string;
  description: string;
  condition: Record<string, unknown>;
  organisation: number | null;
  organisation_name?: string;
  is_active: boolean;
};

export type VolunteerBadge = {
  id: number;
  badge: Badge;
  awarded_at: string;
};

export type MissionApplicationStatus = {
  id?: number;
  status: "none" | "en_attente" | "acceptee" | "refusee" | "annulee" | "liste_attente";
};

export type User = {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  role: "admin" | "organisation" | "benevole";
  status: "actif" | "suspendu" | "en_attente";
  created_at: string;
  last_login_at: string | null;
};

export type Organisation = {
  id: number;
  name: string;
  description: string;
  sector: string;
  category_type: string;
  phone_number: string;
  address: string;
  city: string;
  country: string;
  website: string;
  validation_status: "en_attente" | "validee" | "refusee" | "documents_requis";
  review_reason: string;
  verification_requested_at: string;
  reviewed_at: string | null;
  documents?: OrganisationDocument[];
  user?: User;
};

export type OrganisationDocument = {
  id: number;
  file: string;
  file_url: string;
  label: string;
  uploaded_at: string;
};

export type Application = {
  id: number;
  volunteer: number;
  volunteer_name?: string;
  volunteer_email?: string;
  volunteer_phone_number?: string;
  volunteer_skills?: { name: string; level: string }[];
  volunteer_availability?: string;
  volunteer_profile?: Volunteer;
  mission: number;
  mission_name?: string;
  event_title?: string;
  attendance_status?: string;
  status: "en_attente" | "acceptee" | "refusee" | "annulee" | "liste_attente";
  applied_at: string;
  answered_at: string | null;
};

export type Volunteer = {
  id: number;
  user?: User;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  bio: string;
  photo?: string;
  photo_url?: string | null;
  address: string;
  city: string;
  interests: string;
  availability_notes: string;
  total_points: number;
  show_in_leaderboard: boolean;
  skills_summary?: { name: string; level: string }[];
  phone_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
};

export type OrganisationSummary = {
  events: number;
  volunteers: number;
  applications: number;
  accepted_applications: number;
};

export type EventVolunteer = {
  application_id: number;
  volunteer: Volunteer;
  volunteer_id?: number;
  mission_id?: number;
  mission_name: string;
  participation_status: string;
  hours?: number;
  confirmed_hours?: number | null;
  qr_token?: string;
  arrived_at: string | null;
  departed_at: string | null;
  registered_at: string;
};

export type AdminStats = {
  users: number;
  organisations: number;
  volunteers: number;
  events: number;
  applications: number;
  accepted_applications: number;
};

export type OrganisationStats = {
  events: number;
  active_events: number;
  missions: number;
  applications: number;
  attendances: number;
};

export type VolunteerStats = {
  points: number;
  applications: number;
  accepted_applications: number;
  certificates: number;
  badges: number;
  hours?: number;
  completed_events?: number;
};

export type Certificate = {
  id: number;
  event: number | null;
  event_title?: string;
  event_date?: string;
  volunteer_name?: string;
  organisation_name?: string;
  pdf: string;
  hours: number;
  verification_id: string;
  generated_at: string;
};

export type AppNotification = {
  id: number;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type BadgeProgress = {
  badge: Badge;
  earned: boolean;
  awarded_at: string | null;
  current: number;
  target: number;
  progress_label: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getEvents(params?: { category?: string; city?: string; status?: string; search?: string; archived?: string }): Promise<Event[]> {
  const query = new URLSearchParams();
  query.set("archived", params?.archived ?? "false");
  if (params?.category) query.set("category", params.category);
  if (params?.city) query.set("city", params.city);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const path = query.toString() ? `/evenements/?${query.toString()}` : "/evenements/";
  const data = await apiFetch<PaginatedResponse<Event> | Event[]>(path);
  return unwrapResults(data);
}

export function unwrapResults<T>(data: PaginatedResponse<T> | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return apiFetch<PlatformStats>("/stats/platform/overview/");
}

export async function getFeaturedRecommendations(limit = 3): Promise<MissionRecommendation[]> {
  return apiFetch<MissionRecommendation[]>(`/recommendations/featured/?limit=${limit}`);
}

export function formatDate(value: string): string {
  if (!value) {
    return "Date à confirmer";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
