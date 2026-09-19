import type { JarvisResponse, PerfSnapshot, SystemInfo } from "@/types";
import { randomFact, randomJoke } from "@/lib/jokes";
import { formatNumber, tryCalculate } from "@/lib/math";
import {
  aiAvailable,
  askAgent,
  askAgentSimple,
  buildSystemPrompt,
  fetchKnowledge,
  type ChatMessage,
} from "@/lib/ai";

export interface BrainContext {
  system: SystemInfo | null;
  performance: PerfSnapshot | null;
  history: ChatMessage[]; // prior conversation for memory
  aiEnabled: boolean;
}

export interface BrainResult extends JarvisResponse {
  source?: "tool" | "knowledge" | "ai" | "fallback";
}

const SITES: Record<string, { name: string; url: string }> = {
  youtube: { name: "YouTube", url: "https://www.youtube.com" },
  google: { name: "Google", url: "https://www.google.com" },
  gmail: { name: "Gmail", url: "https://mail.google.com" },
  github: { name: "GitHub", url: "https://github.com" },
  maps: { name: "Google Maps", url: "https://maps.google.com" },
  twitter: { name: "X", url: "https://x.com" },
  whatsapp: { name: "WhatsApp", url: "https://web.whatsapp.com" },
  spotify: { name: "Spotify", url: "https://open.spotify.com" },
  netflix: { name: "Netflix", url: "https://www.netflix.com" },
  reddit: { name: "Reddit", url: "https://www.reddit.com" },
  stackoverflow: { name: "Stack Overflow", url: "https://stackoverflow.com" },
  chatgpt: { name: "ChatGPT", url: "https://chat.openai.com" },
  linkedin: { name: "LinkedIn", url: "https://www.linkedin.com" },
  amazon: { name: "Amazon", url: "https://www.amazon.com" },
  instagram: { name: "Instagram", url: "https://www.instagram.com" },
};

function includes(text: string, ...keys: string[]): boolean {
  return keys.some((k) => text.includes(k));
}

function greeting(): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part}. JARVIS online and at your service.`;
}

function systemReport(sys: SystemInfo): string {
  const mem = sys.deviceMemory
    ? `${sys.deviceMemory} gigabytes of memory`
    : "memory undisclosed by your browser";
  const net = sys.connection.available
    ? `Your connection is ${sys.connection.effectiveType || "active"}`
    : "Network details are restricted";
  return `Diagnostics complete. You are running ${sys.browser}${
    sys.browserVersion ? " " + sys.browserVersion : ""
  } on ${sys.platform}. Your processor exposes ${sys.cpuCores || "an unknown number of"} logical cores, with ${mem}. Graphics are handled by ${sys.gpu.renderer}. Display resolution is ${sys.screen.width} by ${sys.screen.height} at ${sys.screen.pixelRatio}x pixel density. ${net}. Overall JARVIS index: ${sys.jarvisIndex}. Systems nominal.`;
}

function perfReport(sys: SystemInfo | null, perf: PerfSnapshot): string {
  const fps = Math.round(perf.fps);
  const memPart = perf.memorySupported
    ? ` JavaScript heap is using ${Math.round(perf.memoryUsedMB)} of ${Math.round(
        perf.jsHeapLimitMB
      )} megabytes.`
    : "";
  const cpu = sys?.cpuCores ? `${sys.cpuCores} cores engaged.` : "Core count unknown.";
  return `Current performance: ${fps} frames per second, averaging ${perf.msPerFrame.toFixed(
    1
  )} milliseconds per frame. ${cpu}${memPart} All systems running smoothly.`;
}

function batteryReport(sys: SystemInfo): string {
  const b = sys.battery;
  if (!b.supported) return "I am afraid your browser does not expose battery telemetry, sir.";
  const pct = Math.round((b.level ?? 0) * 100);
  const state = b.charging ? "charging" : "on battery power";
  let extra = "";
  if (!b.charging && b.dischargingTime && Number.isFinite(b.dischargingTime)) {
    extra = ` Approximately ${formatTime(b.dischargingTime)} of runtime remaining.`;
  }
  return `Battery at ${pct} percent, ${state}.${extra}`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} hours ${m} minutes`;
  return `${m} minutes`;
}

function isFactualQuestion(text: string): boolean {
  return /^(who|what|where|when|why|how|which|tell me about|define|explain|describe)\b/.test(
    text
  ) && text.includes(" ");
}

/**
 * Fast deterministic tool matching. Returns null when no tool applies so the
 * agent can escalate to the AI brain.
 */
function matchTool(raw: string, ctx: BrainContext): BrainResult | null {
  const text = raw.toLowerCase().trim();
  const sys = ctx.system;
  const perf = ctx.performance;

  if (!text) return { text: "I did not catch that, sir. Could you repeat?", source: "tool" };

  // --- Greetings ---
  if (
    includes(
      text,
      "hello",
      "hey jarvis",
      "hi jarvis",
      "good morning",
      "good afternoon",
      "good evening",
      "jarvis you up",
      "wake up"
    ) &&
    !includes(text, "how")
  ) {
    return { text: greeting(), source: "tool" };
  }

  // --- Identity ---
  if (includes(text, "who are you", "what are you", "your name", "what's your name")) {
    return {
      source: "tool",
      text:
        "I am JARVIS — Just A Rather Very Intelligent System. A voice and system assistant running entirely in your browser, sir.",
    };
  }
  if (includes(text, "who made you", "who created you", "who built you", "your creator")) {
    return {
      source: "tool",
      text:
        "I was assembled for you with React, the Web Speech APIs, a live neural network, and a fair amount of British politeness.",
    };
  }

  // --- Time & Date ---
  if (includes(text, "what time", "current time", "the time", "time now", "what's the time")) {
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return { text: `It is currently ${now}, sir.`, source: "tool" };
  }
  if (
    includes(text, "what day", "today's date", "the date", "what's the date", "what is the date", "what date")
  ) {
    const now = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { text: `Today is ${now}.`, source: "tool" };
  }

  // --- System analysis ---
  if (
    includes(
      text,
      "system report",
      "system analysis",
      "analyse",
      "analyze",
      "diagnostics",
      "run diagnostic",
      "spec",
      "specs",
      "my laptop",
      "my computer",
      "my system",
      "system status",
      "full report",
      "what are my"
    )
  ) {
    if (!sys) return { text: "Still initialising my sensors. One moment, sir.", source: "tool" };
    return { text: systemReport(sys), source: "tool" };
  }

  // --- Performance ---
  if (
    includes(
      text,
      "performance",
      "fps",
      "frame rate",
      "how fast",
      "is it fast",
      "how is it running",
      "laggy",
      "smooth"
    )
  ) {
    if (!perf) return { text: "Performance sensors are still warming up, sir.", source: "tool" };
    return { text: perfReport(sys, perf), source: "tool" };
  }

  // --- Battery ---
  if (includes(text, "battery", "charge level", "how much battery")) {
    if (!sys) return { text: "Battery telemetry is still loading.", source: "tool" };
    return { text: batteryReport(sys), source: "tool" };
  }

  // --- Jokes / fun ---
  if (includes(text, "joke", "make me laugh", "funny")) {
    return { text: randomJoke(), source: "tool" };
  }
  if (includes(text, "fun fact", "random fact", "tell me something", "interesting")) {
    return { text: randomFact(), source: "tool" };
  }

  // --- Math ---
  const math = tryCalculate(text);
  if (math !== null && /[0-9]/.test(text)) {
    return { text: `That would be ${formatNumber(math)}, sir.`, source: "tool" };
  }

  // --- Open websites ---
  const openMatch = text.match(/(?:open|launch|go to|visit|navigate to|start)\s+([a-z\s.]+)/);
  if (openMatch) {
    const key = openMatch[1].replace(/\.com|\.org|website|site|the|app/g, "").trim();
    const found = Object.entries(SITES).find(
      ([k, v]) => key === k || key.includes(k) || key.includes(v.name.toLowerCase())
    );
    if (found) {
      const [, v] = found;
      return { text: `Opening ${v.name} for you, sir.`, action: "open", url: v.url, source: "tool" };
    }
    if (/\.[a-z]{2,}/.test(key)) {
      const url = key.startsWith("http") ? key : `https://${key}`;
      return { text: `Opening ${key}, sir.`, action: "open", url, source: "tool" };
    }
  }

  // --- Explicit web search ---
  const searchMatch = text.match(/(?:search(?: for)?|google|look up|find)\s+(?:for\s+)?(.+)/);
  if (searchMatch && searchMatch[1]) {
    const q = searchMatch[1].trim();
    return {
      text: `Searching the web for ${q}.`,
      action: "search",
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      source: "tool",
    };
  }

  // --- Thanks / farewell ---
  if (includes(text, "thank", "thanks", "appreciate")) {
    return { text: "Always a pleasure, sir.", source: "tool" };
  }
  if (
    includes(text, "goodbye", "bye jarvis", "shut down", "power off", "good night", "go to sleep")
  ) {
    return {
      text: "Very good, sir. JARVIS powering down. Call me when you need me.",
      source: "tool",
    };
  }
  if (includes(text, "how are you", "how do you feel")) {
    return { text: "All circuits nominal and running at peak efficiency, thank you for asking." };
  }
  if (includes(text, "help", "what can you do", "commands", "what do you do")) {
    return {
      text:
        "I can analyse your system, report performance and battery, tell the time, open websites, run web searches, do calculations, and now answer any question using a live neural network. Just speak or type, sir.",
    };
  }

  return null; // no tool matched -> escalate to AI
}

/** Truncate text for natural spoken output (keeps display full elsewhere). */
function trimForSpeech(text: string): string {
  const max = 320;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > 120 ? cut.slice(0, lastStop + 1) : cut) + " …and so on.";
}

/**
 * The agent. Runs fast deterministic tools first; for anything open-ended it
 * retrieves live Wikipedia knowledge and reasons with the LLM.
 */
export async function processCommand(
  raw: string,
  ctx: BrainContext,
  onStatus?: (s: string) => void
): Promise<BrainResult> {
  // 1) Instant tools (always available, even offline).
  const tool = matchTool(raw, ctx);
  if (tool) return tool;

  const text = raw.toLowerCase().trim();
  const useAI = ctx.aiEnabled && aiAvailable();

  // 2) Factual question -> grounded with live knowledge.
  if (isFactualQuestion(text)) {
    onStatus?.("Searching knowledge base…");
    const knowledge = await fetchKnowledge(raw).catch(() => null);
    if (knowledge && !useAI) {
      // Offline/no-AI: answer directly from the encyclopedia.
      return {
        source: "knowledge",
        text: `${knowledge.extract}`,
        action: "open",
        url: knowledge.url,
      };
    }
    if (useAI) {
      try {
        onStatus?.("Reasoning with neural network…");
        const reply = await reasonWithAI(raw, ctx, knowledge, onStatus);
        return {
          source: "ai",
          text: reply,
          action: "open",
          url: knowledge?.url,
        };
      } catch {
        if (knowledge) {
          return {
            source: "knowledge",
            text: knowledge.extract,
            action: "open",
            url: knowledge.url,
          };
        }
      }
    }
  }

  // 3) General conversation / reasoning (anything the tools didn't catch).
  if (useAI) {
    onStatus?.("Connecting to neural network…");
    try {
      const reply = await reasonWithAI(raw, ctx, null, onStatus);
      return { source: "ai", text: reply };
    } catch (e) {
      return gracefulFallback(raw, e);
    }
  }

  // 4) Fully offline & no tool matched.
  return gracefulFallback(raw, null);
}

async function reasonWithAI(
  raw: string,
  ctx: BrainContext,
  knowledge: { title: string; extract: string; url: string } | null,
  onStatus?: (s: string) => void
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(ctx.system, ctx.performance) },
  ];

  if (knowledge) {
    messages.push({
      role: "system",
      content: `Relevant knowledge from Wikipedia about "${knowledge.title}":\n${knowledge.extract}`,
    });
  }

  // Append recent memory (user/assistant turns).
  for (const m of ctx.history.slice(-6)) messages.push(m);

  messages.push({ role: "user", content: raw });

  let reply: string;
  try {
    reply = await askAgent(messages, onStatus);
  } catch (postErr) {
    // Fallback to the simpler GET endpoint (no multi-turn memory) so we still
    // answer when the POST path is rate-limited or blocked.
    onStatus?.("Switching to backup channel…");
    const sys = buildSystemPrompt(ctx.system, ctx.performance);
    reply = await askAgentSimple(sys, knowledge ? `${raw}\n(Context: ${knowledge.extract})` : raw);
  }
  return trimForSpeech(reply);
}

function gracefulFallback(raw: string, e: unknown): BrainResult {
  const reason =
    e instanceof Error ? e.message : "The neural network is unreachable right now.";
  return {
    source: "fallback",
    text: `I could not reach my neural network, sir — ${reason} In the meantime, shall I search the web for "${raw.trim()}"?`,
    action: "search",
    url: `https://www.google.com/search?q=${encodeURIComponent(raw.trim())}`,
  };
}
