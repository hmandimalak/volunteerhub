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
  city: string;
  country: string;
  status: string;
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
  starts_at: string;
  ends_at: string;
  status: string;
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
  address: string;
  city: string;
  interests: string;
  availability_notes: string;
  total_points: number;
  show_in_leaderboard: boolean;
  skills_summary?: { name: string; level: string }[];
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
  mission_name: string;
  participation_status: string;
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
};

export type Certificate = {
  id: number;
  event: number | null;
  pdf: string;
  generated_at: string;
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

export async function getEvents(): Promise<Event[]> {
  const data = await apiFetch<PaginatedResponse<Event> | Event[]>("/evenements/");
  return unwrapResults(data);
}

export function unwrapResults<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function formatDate(value: string): string {
  if (!value) {
    return "Date a confirmer";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
