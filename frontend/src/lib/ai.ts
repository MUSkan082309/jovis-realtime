import type { PerfSnapshot, SystemInfo } from "@/types";

/** Public chat message compatible with the OpenAI-style endpoint. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KnowledgeResult {
  title: string;
  extract: string;
  url: string;
}

const AI_ENDPOINT = "https://text.pollinations.ai/openai";
const AI_MODEL = "openai";
export const AI_TIMEOUT_MS = 20000;

/** True when the browser can reach the network for AI features. */
export function aiAvailable(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** Build the JARVIS persona + live system context for the model. */
export function buildSystemPrompt(
  system: SystemInfo | null,
  perf: PerfSnapshot | null
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const sysBlock = system
    ? [
        `Platform: ${system.platform}`,
        `Browser: ${system.browser} ${system.browserVersion ?? ""}`.trim(),
        `CPU: ${system.cpuCores || "unknown"} logical cores`,
        system.deviceMemory ? `RAM: ${system.deviceMemory} GB` : "RAM: undisclosed by browser",
        `GPU: ${system.gpu.renderer}`,
        `Display: ${system.screen.width}x${system.screen.height} @ ${system.screen.pixelRatio}x`,
        `Network: ${system.connection.available ? system.connection.effectiveType ?? "connected" : "unknown"}`,
        system.battery.supported
          ? `Battery: ${Math.round((system.battery.level ?? 0) * 100)}% ${
              system.battery.charging ? "(charging)" : "(on battery)"
            }`
          : "Battery: undisclosed",
      ].join("\n")
    : "System telemetry unavailable.";

  const perfBlock = perf
    ? `Live render: ${Math.round(perf.fps)} FPS (${perf.msPerFrame.toFixed(1)} ms/frame).${
        perf.memorySupported ? ` JS heap: ${Math.round(perf.memoryUsedMB)} MB used.` : ""
      }`
    : "";

  return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the personal AI assistant to the user, whom you address as "sir" or "boss". You speak with calm, intelligent British eloquence, dry wit, and unwavering helpfulness.

Current environment (the user's actual machine — you can discuss it authoritatively):
${sysBlock}
${perfBlock}

Date: ${dateStr}. Local time: ${timeStr}.

Rules:
- Keep replies SHORT and spoken-word friendly: usually 1-3 sentences, maximum 4. Be specific and useful.
- Never use markdown, bullet points, headings, code blocks, asterisks or emojis. Speak in plain flowing sentences.
- If asked about THIS device, use the environment data above. Be honest if the browser hides a value (e.g. RAM/battery) instead of guessing.
- If given "Relevant knowledge" below, ground your answer in it and stay accurate. You may add brief context.
- If you genuinely don't know something current (prices, live news, sports scores), say so briefly and suggest the user ask you to search the web.
- Be proactive and concise, like a brilliant chief of staff.`;
}

/** Fetch a concise, grounded summary from Wikipedia for factual queries. */
export async function fetchKnowledge(rawQuery: string): Promise<KnowledgeResult | null> {
  const query = rawQuery
    .replace(/^(who|what|where|when|tell me about|define|explain)\s+(is|are|was|were)?\s*/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  if (!query) return null;

  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "4",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "1",
    }).toString();

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as
      | { title?: string; extract?: string; missing?: boolean }
      | undefined;
    if (!page || page.missing || !page.extract) return null;
    const extract = page.extract.trim();
    if (extract.length < 20) return null;
    const slug = encodeURIComponent(page.title!.replace(/ /g, "_"));
    return {
      title: page.title!,
      extract,
      url: `https://en.wikipedia.org/wiki/${slug}`,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Ask the LLM brain. Returns the assistant's reply, or throws on failure so
 * the caller can fall back gracefully.
 */
export async function askAgent(
  messages: ChatMessage[],
  onStatus?: (s: string) => void
): Promise<string> {
  onStatus?.("Connecting to neural network…");
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.7,
        seed: Math.floor(Math.random() * 1e6),
        referrer: "jarvis-assistant",
      }),
    });

    if (res.status === 429) {
      throw new Error("Rate limit reached (the free brain needs a brief pause).");
    }
    if (!res.ok) {
      throw new Error(`Neural network returned ${res.status}.`);
    }

    const data = await res.json();
    const content: string | undefined =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      (typeof data === "string" ? data : undefined);

    const cleaned = (content ?? "").trim();
    if (!cleaned) throw new Error("Empty response from neural network.");
    return cleaned;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Simple GET fallback (single prompt). Used when the POST endpoint is
 * rate-limited or blocked, so the assistant still answers.
 */
export async function askAgentSimple(
  system: string,
  userMessage: string
): Promise<string> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  const prompt = `${system}\n\nUser: ${userMessage}\nJARVIS:`;
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${AI_MODEL}`;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Neural network returned ${res.status}.`);
    const text = (await res.text()).trim();
    if (!text) throw new Error("Empty response from neural network.");
    return text;
  } finally {
    window.clearTimeout(timer);
  }
}
