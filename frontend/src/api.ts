const API_BASE = '/api';

export interface UserResponse {
  message: string;
  jwt_token: string;
}

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
}): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail ?? `Registration failed: ${res.statusText}`);
  }
  return res.json();
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail ?? `Login failed: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadHeadshot(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload-headshot`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.url as string;
}

export async function createJob(
  payload: { prompt: string; numThumbnails: number; headshotUrl: string },
  token: string,
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      num_thumbnails: payload.numThumbnails,
      headshot_url: payload.headshotUrl,
    }),
  });
  if (!res.ok) throw new Error(`Create job failed: ${res.statusText}`);
  return res.json();
}

export async function getJob(jobId: string) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Get job failed: ${res.statusText}`);
  return res.json();
}

export interface BackendThumbnail {
  id: string;
  style_name: string;
  status: string;
  imagekit_url: string | null;
  error_message: string | null;
  variants: Record<string, string> | null;
  job_id: string | null;
  prompt: string | null;
  created_at: string | null;
}

export async function getThumbnails(token: string): Promise<BackendThumbnail[]> {
  const res = await fetch(`${API_BASE}/thumbnails`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch thumbnails: ${res.statusText}`);
  return res.json();
}

export interface ThumbnailEvent {
  thumbnail_id: string;
  style_name: string;
  imagekit_url: string;
  variants: Record<string, string>;
}

export function subscribeToJob(
  jobId: string,
  handlers: {
    onThumbnailReady: (data: ThumbnailEvent) => void;
    onThumbnailFailed: (data: { thumbnail_id: string; style_name: string; error: string }) => void;
    onJobCompleted: (data: { job_id: string; status: string }) => void;
    onError: (data: unknown) => void;
  }
): EventSource {
  const es = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);

  es.addEventListener('thumbnail_ready', (e: MessageEvent) => {
    handlers.onThumbnailReady(JSON.parse(e.data));
  });
  es.addEventListener('thumbnail_failed', (e: MessageEvent) => {
    handlers.onThumbnailFailed(JSON.parse(e.data));
  });
  es.addEventListener('job_completed', (e: MessageEvent) => {
    handlers.onJobCompleted(JSON.parse(e.data));
    es.close();
  });
  es.addEventListener('error', (e: MessageEvent) => {
    try { handlers.onError(JSON.parse(e.data)); } catch { handlers.onError(e); }
    es.close();
  });

  return es;
}
