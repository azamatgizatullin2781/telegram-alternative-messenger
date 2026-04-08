import func2url from "../../backend/func2url.json";
import { AppSettings } from "@/types";

export const AUTH_URL = func2url.auth;
export const CHATS_URL = func2url.chats;
export const MESSAGES_URL = func2url.messages;
export const BOT_URL = func2url.bot;
export const UPLOAD_URL = func2url.upload;
export const CALLS_URL = (func2url as Record<string, string>).calls || "";
export const CHANNELS_URL = (func2url as Record<string, string>).channels || "";

export const getToken = () => localStorage.getItem("wc_token") || "";

export async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };
  try {
    const res = await fetch(url, { ...opts, headers });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, data: { error: msg } };
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if ((d.startsWith("7") || d.startsWith("8")) && d.length === 11) {
    const n = d.slice(1);
    return `+7 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`;
  }
  return raw;
}

export function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return "Браузер";
}

export function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Неизвестно";
}

export function applyTheme(s: AppSettings) {
  const root = document.documentElement;
  const resolved = s.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : s.theme;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-accent", s.accent === "blue" ? "" : s.accent);
  root.setAttribute("data-wallpaper", s.wallpaper);
  root.style.fontSize = s.fontSize === "sm" ? "14px" : s.fontSize === "lg" ? "18px" : "16px";
}