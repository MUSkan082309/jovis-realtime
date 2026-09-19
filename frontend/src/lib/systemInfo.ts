import type {
  BatteryInfo,
  ConnectionInfo,
  GpuInfo,
  ScreenInfo,
  SystemFeatures,
  SystemInfo,
} from "@/types";

/** Detect the GPU vendor + renderer via the WebGL debug extension. */
function detectGPU(): GpuInfo {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { vendor: "Unavailable", renderer: "Software rendering" };

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    let vendor = "Unknown";
    let renderer = "Unknown";

    if (dbg) {
      vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || vendor;
      renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || renderer;
    } else {
      vendor = String(gl.getParameter(gl.VENDOR)) || vendor;
      renderer = String(gl.getParameter(gl.RENDERER)) || renderer;
    }

    const webglVersion = String(gl.getParameter(gl.VERSION));
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));

    return {
      vendor: cleanText(vendor),
      renderer: cleanRenderer(renderer),
      webglVersion,
      maxTextureSize,
    };
  } catch {
    return { vendor: "Unknown", renderer: "Unknown" };
  }
}

function cleanText(s: string): string {
  return (s || "").replace(/Google Inc\.\s*\(?/gi, "").replace(/[()]/g, "").trim() || "Unknown";
}

function cleanRenderer(r: string): string {
  if (!r) return "Unknown";
  let s = r;
  const angle = s.match(/^ANGLE\s*\((.*)\)$/i);
  if (angle) s = angle[1];
  // Strip the graphics API suffix that Chrome appends.
  s = s.replace(/\s*,?\s*(Direct3D11|Direct3D9|OpenGL|Vulkan|Metal|D3D11|D3D9).*$/i, "");
  s = s.replace(/\s*,?\s*(vs_\d+_\d+|ps_\d+_\d+).*$/i, "");
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // Prefer the most descriptive segment (longest), drop bare vendor tokens.
  const descriptive = parts.sort((a, b) => b.length - a.length)[0] || parts.join(" ");
  return descriptive || r;
}

function detectScreen(): ScreenInfo {
  const orientation =
    (screen.orientation && screen.orientation.type) || undefined;
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    orientation,
  };
}

function detectPlatform(ua: string): { platform: string; bits?: number } {
  if (navigator.userAgentData?.platform) {
    return { platform: navigator.userAgentData.platform };
  }
  if (/Windows NT 10/.test(ua)) return { platform: "Windows 10/11", bits: 64 };
  if (/Windows NT 6\.3/.test(ua)) return { platform: "Windows 8.1" };
  if (/Windows NT 6\.2/.test(ua)) return { platform: "Windows 8" };
  if (/Windows NT 6\.1/.test(ua)) return { platform: "Windows 7" };
  if (/Windows/.test(ua)) return { platform: "Windows" };
  if (/iPhone|iPad|iPod/.test(ua)) return { platform: "iOS" };
  if (/Mac OS X/.test(ua)) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    return {
      platform: "macOS" + (m ? " " + m[1].replace(/_/g, ".") : ""),
      bits: 64,
    };
  }
  if (/Android/.test(ua)) return { platform: "Android" };
  if (/CrOS/.test(ua)) return { platform: "Chrome OS" };
  if (/Linux/.test(ua)) return { platform: "Linux" };
  return { platform: navigator.platform || "Unknown" };
}

function detectBrowser(ua: string): {
  browser: string;
  version?: string;
  engine?: string;
} {
  const edge = ua.match(/Edg\/(\d+)/);
  if (edge) return { browser: "Microsoft Edge", version: edge[1], engine: "Blink" };
  const opr = ua.match(/OPR\/(\d+)/);
  if (opr) return { browser: "Opera", version: opr[1], engine: "Blink" };
  const chrome = ua.match(/Chrome\/(\d+)/);
  if (chrome && !/Edg|OPR/.test(ua))
    return { browser: "Google Chrome", version: chrome[1], engine: "Blink" };
  const firefox = ua.match(/Firefox\/(\d+)/);
  if (firefox) return { browser: "Mozilla Firefox", version: firefox[1], engine: "Gecko" };
  const safari = ua.match(/Version\/(\d+).*Safari/);
  if (safari) return { browser: "Safari", version: safari[1], engine: "WebKit" };
  return { browser: "Unknown browser" };
}

function readConnection(): ConnectionInfo {
  const c = navigator.connection;
  if (!c) return { available: false };
  return {
    available: true,
    effectiveType: c.effectiveType,
    downlink: c.downlink,
    rtt: c.rtt,
    saveData: c.saveData,
  };
}

async function readBattery(): Promise<BatteryInfo> {
  if (!navigator.getBattery) return { supported: false };
  try {
    const b = await navigator.getBattery.call(navigator);
    return {
      supported: true,
      level: b.level,
      charging: b.charging,
      chargingTime: b.chargingTime,
      dischargingTime: b.dischargingTime,
    };
  } catch {
    return { supported: false };
  }
}

function readFeatures(): SystemFeatures {
  return {
    webgl2: !!document.createElement("canvas").getContext("webgl2"),
    touch:
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      matchMedia("(pointer: coarse)").matches,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    serviceWorker: "serviceWorker" in navigator,
    cookieEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    doNotTrack: navigator.doNotTrack ?? undefined,
    languages: Array.from(navigator.languages || [navigator.language]),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
  };
}

/** Heuristic performance score so Jarvis can "rate" the machine. */
function computeJarvisIndex(
  cores: number,
  memory: number,
  gpu: GpuInfo,
  screen: ScreenInfo
): number {
  let score = 0;
  score += Math.min(cores, 32) * 18; // CPU weight
  score += Math.min(memory || 4, 64) * 10; // RAM weight
  const r = gpu.renderer.toLowerCase();
  if (/(rtx|rx 6|rx 7|rx 8|m1|m2|m3|m4|arc a|apple)/.test(r)) score += 320;
  else if (/(gtx|radeon hd|radeon rx|iris xe|uhd|geforce)/.test(r)) score += 180;
  else score += 60;
  score += Math.min(screen.width * screen.height, 8_000_000) / 50_000;
  return Math.round(score);
}

export async function gatherSystemInfo(): Promise<SystemInfo> {
  const ua = navigator.userAgent;
  const gpu = detectGPU();
  const screen = detectScreen();
  const plat = detectPlatform(ua);
  const br = detectBrowser(ua);
  const connection = readConnection();
  const battery = await readBattery();
  const features = readFeatures();

  const cpuCores = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory || 0;

  return {
    cpuCores,
    deviceMemory,
    gpu,
    screen,
    platform: plat.platform,
    platformBits: plat.bits,
    browser: br.browser,
    browserVersion: br.version,
    engine: br.engine,
    userAgent: ua,
    connection,
    battery,
    features,
    jarvisIndex: computeJarvisIndex(cpuCores, deviceMemory, gpu, screen),
    scannedAt: Date.now(),
  };
}
