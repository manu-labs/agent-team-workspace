import { User, Event, RSVP, CreateUserPayload, UpdateUserPayload } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Add trailing slash before query string to avoid Railway HTTP redirect (307 mixed-content block)
  const [pathPart, query] = path.split("?");
  const normalizedPath = pathPart.endsWith("/") ? pathPart : `${pathPart}/`;
  const url = `${API_BASE}/api/v1${normalizedPath}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json();
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUser(userId: string): Promise<User> {
  return request<User>(`/users/${userId}`);
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload
): Promise<User> {
  return request<User>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return request(`/users/${userId}`, { method: "DELETE" });
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(params?: {
  page?: number;
  limit?: number;
  platform?: string;
  search?: string;
}): Promise<Event[]> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.platform) sp.set("platform", params.platform);
  if (params?.search) sp.set("search", params.search);
  const query = sp.toString();
  return request<Event[]>(`/events${query ? `?${query}` : ""}`);
}

export async function triggerScrape(): Promise<{ message: string }> {
  return request("/events/scrape", { method: "POST" });
}

// ── RSVPs ────────────────────────────────────────────────────────────────────

export async function getRSVPs(userId: string): Promise<RSVP[]> {
  return request<RSVP[]>(`/rsvps?user_id=${userId}`);
}

export async function triggerMatch(
  userId: string
): Promise<{ message: string }> {
  return request(`/match/${userId}`, { method: "POST" });
}

export async function triggerAutoRSVP(): Promise<{ message: string }> {
  return request("/jobs/run", { method: "POST" });
}

export async function retryRSVP(rsvpId: string): Promise<RSVP> {
  return request<RSVP>(`/rsvps/${rsvpId}/retry`, { method: "POST" });
}

export async function skipRSVP(rsvpId: string): Promise<RSVP> {
  return request<RSVP>(`/rsvps/${rsvpId}/skip`, { method: "POST" });
}

