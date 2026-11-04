import { Hono, type MiddlewareHandler } from "hono";
import type { AppVariables } from "../auth/guards";

/**
 * Which AI the Bots are using right now, for the phone and the PC to show in plain words. With the
 * online/offline switch on (AI_SWITCH=on), the switch's own /health says whether the last answer
 * came from the online AI or from the PC's own offline AI. Without it, there is only one AI.
 */
export type AiStatus =
  | { switch: false }
  | {
      switch: true;
      /** An online AI is set up; when false the switch only ever uses the offline AI. */
      online: boolean;
      /** Which side answered last, or null before the first answer. */
      lastUsed: "online" | "offline" | null;
      /** The online AI failed recently, so the offline one answers for a minute. */
      offlineForNow: boolean;
    }
  | { switch: true; unreachable: true };

type Health = (url: string) => Promise<unknown>;

const defaultHealth: Health = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/** Where the switch's /health is, from OPENAI_BASE_URL (".../v1" points at the switch). */
export function switchHealthUrl(
  env: Record<string, string | undefined>,
): string | null {
  if (env.AI_SWITCH?.toLowerCase() !== "on") return null;
  const base = env.OPENAI_BASE_URL;
  if (!base) return null;
  try {
    const url = new URL(base);
    url.pathname = "/health";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

export async function readAiStatus(
  env: Record<string, string | undefined>,
  health: Health = defaultHealth,
): Promise<AiStatus> {
  const url = switchHealthUrl(env);
  if (!url) return { switch: false };
  try {
    const answer = (await health(url)) as Record<string, unknown> | null;
    const lastUsed = answer?.lastUsed;
    return {
      switch: true,
      online: answer?.online === true,
      lastUsed:
        lastUsed === "online" || lastUsed === "offline" ? lastUsed : null,
      offlineForNow: answer?.offlineForNow === true,
    };
  } catch {
    return { switch: true, unreachable: true };
  }
}

export function createAiStatusRoutes(
  requireUser: MiddlewareHandler<{ Variables: AppVariables }>,
  env: Record<string, string | undefined> = process.env,
  health: Health = defaultHealth,
) {
  const routes = new Hono<{ Variables: AppVariables }>();
  routes.use("*", requireUser);
  routes.get("/status", async (context) =>
    context.json({ ai: await readAiStatus(env, health) }),
  );
  return routes;
}
