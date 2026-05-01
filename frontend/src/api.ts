const API_BASE = "/api";

export async function uploadHeadshot(file: File): Promise<any> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/upload-headshot`, {
        method: "POST",
        body: form
    });
    if (!response.ok) {
        throw new Error(`Failed to upload headshot: ${response.statusText}`);
    }
    return response.json();
}

export async function createJob({ prompt, numThumbnails, headshotUrl }: { prompt: string; numThumbnails: number; headshotUrl: string }): Promise<any> {
    const response = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            num_thumbnails: numThumbnails,
            headshot_url: headshotUrl
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to create job: ${response.statusText}`);
    }
    return response.json();
}

export async function subscribeToJob(jobId: string, { onThumbnailReady, onThumbnailFailed, onJobCompleted, onError }:
    { onThumbnailReady: (thumbnail: any) => void, onThumbnailFailed: (thumbnail: any) => void, onJobCompleted: (job: any) => void, onError: (error: any) => void }) {
    const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);

    eventSource.addEventListener("thumbnail_ready", (event: MessageEvent) => {
        onThumbnailReady(JSON.parse(event.data));
    });

    eventSource.addEventListener("thumbnail_failed", (event: MessageEvent) => {
        onThumbnailFailed(JSON.parse(event.data));
    });

    eventSource.addEventListener("job_completed", (event: MessageEvent) => {
        onJobCompleted(JSON.parse(event.data));
        eventSource.close();
    });

    eventSource.addEventListener("error", (event: MessageEvent) => {
        onError(JSON.parse(event.data));
        eventSource.close();
    });

    return eventSource;
}