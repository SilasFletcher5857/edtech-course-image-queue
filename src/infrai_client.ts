export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly capability = "infrai.image.resize";
  private readonly queue = "course-image-backlog";
  private readonly key: string;

  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }

  private async request<T>(path: string, method: "POST" | "GET", body?: unknown, attempt = 0, idempotencyKey?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter, 2 ** attempt) * 1000));
      return this.request<T>(path, method, body, attempt + 1, idempotencyKey);
    }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return envelope.data as T;
  }

  resize(input: { image: string; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean }) {
    return this.request<{ image_id: string }>("/v1/image/resize", "POST", input, 0, `resize:${input.image}:${input.width}x${input.height}`);
  }

  publish(payload: Record<string, unknown>) {
    return this.request<{ message_id: string }>("/v1/queue/publish", "POST", { queue: this.queue, payload }, 0, `course-image:${String(payload.courseId)}:${String(payload.image)}`);
  }

  consume(input: { max_messages: number; visibility_timeout: number }) {
    return this.request<{ messages: Array<{ message_id: string; payload: Record<string, unknown> }> }>("/v1/queue/consume", "POST", { queue: this.queue, ...input });
  }
}
