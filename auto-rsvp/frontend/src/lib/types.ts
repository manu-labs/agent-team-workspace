export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  interests_description: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  rsvp_url: string;
  platform: string;
  raw_text?: string;
}

export type RSVPStatus =
  | "pending"
  | "in_progress"
  | "success"
  | "failed"
  | "already_full"
  | "manual_required"
  | "skipped";

export interface RSVP {
  id: string;
  user_id: string;
  event_id: string;
  match_score: number;
  status: RSVPStatus;
  match_reason?: string;
  error_message?: string;
  event?: Event;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  interests_description: string;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  interests_description?: string;
}
