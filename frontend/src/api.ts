const API_BASE = '/api';

export async function uploadHeadshot(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload-headshot`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  // Backend bug: returns { [url]: url } instead of { url }
  return (Object.keys(data)[0] ?? Object.values(data)[0]) as string;
}

export async function createJob(payload: {
  prompt: string;
  numThumbnails: number;
  headshotUrl: string;
}): Promise<{ job_id: number }> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: payload.prompt,
      num_thumbnails: payload.numThumbnails,
      headshot_url: payload.headshotUrl,
    }),
  });
  if (!res.ok) throw new Error(`Create job failed: ${res.statusText}`);
  return res.json();
}

export async function getJob(jobId: number) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Get job failed: ${res.statusText}`);
  return res.json();
}

export interface ThumbnailEvent {
  thumbnail_id: number;
  style_name: string;
  imagekit_url: string;
  variants: Record<string, string>;
}

export function subscribeToJob(
  jobId: string,
  handlers: {
    onThumbnailReady: (data: ThumbnailEvent) => void;
    onThumbnailFailed: (data: { thumbnail_id: number; style_name: string; error: string }) => void;
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
