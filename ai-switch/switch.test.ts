import { describe, expect, test } from "bun:test";
import {
  configFromEnvironment,
  createSwitch,
  type SwitchConfig,
} from "./switch";

const config: SwitchConfig = {
  online: { url: "https://online.example/v1", key: "k", model: "big-online" },
  offline: { url: "http://ollama:11434/v1", model: "qwen2.5:7b" },
  onlineWaitMs: 1000,
  retryAfterMs: 60_000,
};

function ask() {
  return new Request("http://switch/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "anything", messages: [] }),
  });
}

type Call = { url: string; model: string; auth: string | null };

function fakeFetch(online: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const call = {
      url,
      model: JSON.parse(String(init.body)).model,
      auth: new Headers(init.headers).get("authorization"),
    };
    calls.push(call);
    if (url.startsWith("https://online.example")) return online(call);
    return Response.json({ from: "offline" });
  }) as unknown as typeof fetch;
  return { send, calls };
}

describe("AI switch", () => {
  test("uses the online AI first, with its own model and key", async () => {
    const { send, calls } = fakeFetch(() => Response.json({ from: "online" }));
    const response = await createSwitch(config, send).handle(ask());
    expect(await response.json()).toEqual({ from: "online" });
    expect(response.headers.get("x-openbot-ai")).toBe("online");
    expect(calls).toEqual([
      {
        url: "https://online.example/v1/chat/completions",
        model: "big-online",
        auth: "Bearer k",
      },
    ]);
  });

  test("goes offline when the internet is gone", async () => {
    const { send, calls } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    const response = await createSwitch(config, send).handle(ask());
    expect(await response.json()).toEqual({ from: "offline" });
    expect(response.headers.get("x-openbot-ai")).toBe("offline");
    expect(calls[1]).toEqual({
      url: "http://ollama:11434/v1/chat/completions",
      model: "qwen2.5:7b",
      auth: "Bearer local",
    });
  });

  test("goes offline when the online AI is too busy or broken", async () => {
    for (const status of [429, 500, 503]) {
      const { send } = fakeFetch(() => new Response("busy", { status }));
      const response = await createSwitch(config, send).handle(ask());
      expect(await response.json()).toEqual({ from: "offline" });
    }
  });

  test("goes offline on any other failure too, such as a sign-in that ran out", async () => {
    for (const status of [400, 401, 404]) {
      const { send } = fakeFetch(() => new Response("no", { status }));
      const response = await createSwitch(config, send).handle(ask());
      expect(await response.json()).toEqual({ from: "offline" });
    }
  });

  test("stays offline for a while after a failure, then tries online again", async () => {
    let time = 0;
    let up = false;
    const { send, calls } = fakeFetch(() => {
      if (!up) throw new TypeError("fetch failed");
      return Response.json({ from: "online" });
    });
    const ai = createSwitch(config, send, () => time);
    await ai.handle(ask());
    expect(calls).toHaveLength(2);
    up = true;
    time = 30_000;
    expect(await (await ai.handle(ask())).json()).toEqual({ from: "offline" });
    expect(calls).toHaveLength(3);
    time = 61_000;
    expect(await (await ai.handle(ask())).json()).toEqual({ from: "online" });
  });

  test("goes offline when the online AI takes too long to start answering", async () => {
    const { send } = fakeFetch(() => new Promise<Response>(() => {}));
    // A fetch that never answers only stops through the abort signal.
    const slowSend = (async (url: string, init: RequestInit) => {
      if (url.startsWith("https://online.example")) {
        return new Promise<Response>((_, reject) =>
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("timed out", "AbortError")),
          ),
        );
      }
      return send(url, init);
    }) as unknown as typeof fetch;
    const response = await createSwitch(
      { ...config, onlineWaitMs: 20 },
      slowSend,
    ).handle(ask());
    expect(await response.json()).toEqual({ from: "offline" });
  });

  test("with no online AI set, uses the offline AI only", async () => {
    const { send, calls } = fakeFetch(() => Response.json({ from: "online" }));
    const response = await createSwitch(
      { ...config, online: undefined },
      send,
    ).handle(ask());
    expect(await response.json()).toEqual({ from: "offline" });
    expect(calls).toHaveLength(1);
  });

  test("reads its settings from the environment", () => {
    const read = configFromEnvironment({
      ONLINE_AI_URL: "https://generativelanguage.googleapis.com/v1beta/openai",
      ONLINE_AI_KEY: "secret",
      ONLINE_AI_MODEL: "gemini-2.5-flash",
      OFFLINE_AI_MODEL: "qwen2.5:7b",
    });
    expect(read.online?.model).toBe("gemini-2.5-flash");
    expect(read.offline.url).toBe("http://host.docker.internal:11434/v1");
    expect(configFromEnvironment({}).online).toBeUndefined();
  });
});
