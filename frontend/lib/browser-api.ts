"use client";

import { API_BASE_URL, User } from "./api";

const TOKEN_KEY = "volunteerhub.accessToken";
const REFRESH_TOKEN_KEY = "volunteerhub.refreshToken";
const USER_KEY = "volunteerhub.currentUser";

export type LoginResponse = {
  access: string;
  refresh: string;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveTokens(tokens: LoginResponse): void {
  window.localStorage.setItem(TOKEN_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function saveCurrentUser(user: User): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUserFromStorage(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function clearTokens(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("E-mail ou mot de passe invalide.");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function registerUser(formData: FormData): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Inscription impossible."));
  }

  return response.json() as Promise<User>;
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) {
    return fallback;
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data.detail === "string") {
      return data.detail;
    }
    const labels: Record<string, string> = {
      email: "E-mail",
      password: "Mot de passe",
      username: "Identifiant",
      first_name: "Prénom",
      last_name: "Nom",
      organisation_name: "Nom de l'organisation",
      organisation_documents: "Documents officiels",
      organisation_website: "Site web",
      birth_date: "Date de naissance",
      non_field_errors: "Erreur",
    };
    const messages = Object.entries(data).flatMap(([key, value]) => {
      const label = labels[key] ?? key;
      const textValue = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : JSON.stringify(value);
      return `${label} : ${textValue}`;
    });
    return messages.join(" ") || fallback;
  } catch {
    return text;
  }
}

export async function fetchCurrentUser(): Promise<User> {
  return authedFetch<User>("/users/me/");
}

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Connectez-vous pour charger ces données.");
  }

  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function downloadAuthedFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Connectez-vous pour télécharger ce fichier.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
