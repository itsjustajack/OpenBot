/**
 * The AI switch: online AI first, the AI on this computer when the internet is gone.
 *
 * OpenBot and its Bots call this as if it were one OpenAI-compatible server. Each request goes to the
 * online AI (ONLINE_AI_URL, ONLINE_AI_KEY, ONLINE_AI_MODEL). When that can't be reached or answers
 * anything but a success, the same request goes to the offline AI instead (OFFLINE_AI_URL,
 * OFFLINE_AI_MODEL), so work never stops. After a failed try it stays offline for a minute before it
 * tries online again, so nobody waits on a dead connection message after message.
 *
 * Only the `model` field of a request is changed: each side gets its own model name.
 */

export type Side = { url: string; key?: string; model: string };
export type SwitchConfig = {
  online?: Side;
  offline: Side;
  /** How long to wait for a streamed answer from the online AI to start before going offline. */
  onlineWaitMs: number;
  /**
   * How long to wait for an answer that isn't streamed. It only arrives once it is whole, so a long
   * answer from a working online AI takes far longer than a streamed one takes to start.
   */
  onlineAnswerWaitMs: number;
  /** How long to stay offline after the online AI failed. */
  retryAfterMs: number;
};

export function configFromEnvironment(
  environment: Record<string, string | undefined> = process.env,
): SwitchConfig {
  const get = (key: string) => environment[key]?.trim() || undefined;
  const onlineUrl = get("ONLINE_AI_URL");
  const onlineModel = get("ONLINE_AI_MODEL");
  return {
    online:
      onlineUrl && onlineModel
        ? { url: onlineUrl, key: get("ONLINE_AI_KEY"), model: onlineModel }
        : undefined,
    offline: {
      url: get("OFFLINE_AI_URL") ?? "http://host.docker.internal:11434/v1",
      key: get("OFFLINE_AI_KEY"),
      model: get("OFFLINE_AI_MODEL") ?? "qwen2.5:7b",
    },
    onlineWaitMs: Number(get("ONLINE_AI_WAIT_MS") ?? 20_000),
    onlineAnswerWaitMs: Number(get("ONLINE_AI_ANSWER_WAIT_MS") ?? 180_000),
    retryAfterMs: Number(get("ONLINE_AI_RETRY_AFTER_MS") ?? 60_000),
  };
}

/**
 * Any answer but a success sends the request to the offline AI instead. The online AI can fail in
 * many ways when the internet goes (Ollama's online models answer 401, 404 or 502 depending on what
 * broke), and the offline AI getting the same request is never worse than an error.
 */
export function shouldFallBack(status: number): boolean {
  return status < 200 || status >= 300;
}

/**
 * Whether a failure says something about the online AI rather than about this one request. A bad,
 * too large or unreadable request (400, 413, 422) goes offline for that request only, so one odd
 * request doesn't send everyone to the slower offline AI for a minute.
 */
export function staysOfflineAfter(status: number): boolean {
  return ![400, 413, 422].includes(status);
}

function isStreamed(body: string | null): boolean {
  if (body === null) return false;
  try {
    return JSON.parse(body)?.stream === true;
  } catch {
    return false;
  }
}

function join(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function withModel(body: string, model: string): string {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsed.model = model;
      return JSON.stringify(parsed);
    }
  } catch {
    // Not JSON: pass it on as it is.
  }
  return body;
}

function headersFor(request: Request, side: Side): Headers {
  const headers = new Headers();
  const type = request.headers.get("content-type");
  if (type) headers.set("content-type", type);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  headers.set("authorization", `Bearer ${side.key || "local"}`);
  return headers;
}

export function createSwitch(
  config: SwitchConfig,
  send: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  let offlineUntil = 0;
  let lastUsed: "online" | "offline" | null = null;

  async function forward(
    side: Side,
    request: Request,
    path: string,
    body: string | null,
    waitMs?: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = waitMs ? setTimeout(() => controller.abort(), waitMs) : null;
    try {
      const response = await send(join(side.url, path), {
        method: request.method,
        headers: headersFor(request, side),
        body: body === null ? undefined : withModel(body, side.model),
        signal: controller.signal,
      });
      return response;
    } finally {
      // Only the wait for the answer to start is limited; a long streamed answer is left to finish.
      if (timer) clearTimeout(timer);
    }
  }

  function passOn(response: Response, used: "online" | "offline"): Response {
    lastUsed = used;
    const headers = new Headers(response.headers);
    // The body is re-sent as it arrives, already decoded.
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.set("x-openbot-ai", used);
    return new Response(response.body, { status: response.status, headers });
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        online: Boolean(config.online),
        lastUsed,
        offlineForNow: now() < offlineUntil,
      });
    }
    // Everything after /v1 is the OpenAI path: /chat/completions, /models, /responses...
    const path = url.pathname.replace(/^\/v1(?=\/|$)/, "") + url.search;
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? null
        : await request.text();

    if (config.online && now() >= offlineUntil) {
      let stayOffline = true;
      try {
        const response = await forward(
          config.online,
          request,
          path,
          body,
          isStreamed(body) ? config.onlineWaitMs : config.onlineAnswerWaitMs,
        );
        if (!shouldFallBack(response.status)) return passOn(response, "online");
        await response.body?.cancel();
        stayOffline = staysOfflineAfter(response.status);
        console.log(
          stayOffline
            ? `Online AI answered ${response.status}; using the offline AI for now.`
            : `Online AI answered ${response.status} to this request; the offline AI answers it instead.`,
        );
      } catch (error) {
        console.log(
          `Online AI can't be reached (${(error as Error).name}); using the offline AI for now.`,
        );
      }
      if (stayOffline) offlineUntil = now() + config.retryAfterMs;
    }

    try {
      return passOn(
        await forward(config.offline, request, path, body),
        "offline",
      );
    } catch (error) {
      return Response.json(
        {
          error: {
            message: config.online
              ? "Neither the online AI nor the AI on this computer answered. Check the internet, and that Ollama is running."
              : "The AI on this computer didn't answer. Check that Ollama is running.",
            detail: String(error),
          },
        },
        { status: 502 },
      );
    }
  }

  return { handle };
}

if (import.meta.main) {
  const config = configFromEnvironment();
  const port = Number(process.env.AI_SWITCH_PORT ?? 4320);
  const { handle } = createSwitch(config);
  Bun.serve({ port, hostname: "0.0.0.0", fetch: handle, idleTimeout: 0 });
  console.log(
    config.online
      ? `AI switch on ${port}: ${config.online.model} online first, ${config.offline.model} on this computer when offline.`
      : `AI switch on ${port}: no online AI set, using ${config.offline.model} on this computer.`,
  );
}
