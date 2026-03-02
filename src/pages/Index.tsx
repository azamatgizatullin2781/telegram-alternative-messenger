import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const AUTH_URL = func2url.auth;
const CHATS_URL = func2url.chats;
const MESSAGES_URL = func2url.messages;
const BOT_URL = func2url.bot;
const UPLOAD_URL = func2url.upload;
const CALLS_URL = (func2url as Record<string, string>).calls || "";
const CHANNELS_URL = (func2url as Record<string, string>).channels || "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_initials: string;
  status: string;
  avatar_url?: string;
}
interface ChatItem {
  chat_id: number;
  partner: User;
  last_text: string;
  last_time: string;
  last_sender_id: number | null;
  unread: number;
}
interface Message {
  id: number;
  sender_id: number;
  text: string;
  status: string;
  time: string;
  out: boolean;
  msg_type?: string;
  media_url?: string;
  media_name?: string;
  media_size?: number;
  reply_to_id?: number;
  geo_lat?: number;
  geo_lon?: number;
  contact_name?: string;
  contact_phone?: string;
}
interface BotMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  extra?: Record<string, unknown>;
  time: string;
}
interface CallSession {
  id: number;
  room_id: string;
  call_type: "audio" | "video";
  status: string;
  caller: User;
}
type Theme = "light" | "dark" | "system";
type Accent = "blue" | "green" | "purple" | "red" | "orange" | "pink";
type Wallpaper = "plain" | "dots" | "grid" | "bubbles";
interface AppSettings {
  theme: Theme;
  accent: Accent;
  wallpaper: Wallpaper;
  notifications: boolean;
  notifSound: boolean;
  notifPreview: boolean;
  language: string;
  region: string;
  fontSize: "sm" | "md" | "lg";
}
interface DeviceInfo {
  name: string;
  os: string;
  browser: string;
  current: boolean;
}
type Section = "chats" | "channels" | "bots" | "contacts" | "calls" | "settings" | "profile";
type ChatSearchTab = "chats" | "people";
interface Channel {
  id: number;
  name: string;
  description: string;
  avatar_color: string;
  avatar_url?: string;
  members_count: number;
  is_public: boolean;
  slug: string;
  owner_id: number;
  subscribed: boolean;
  role?: string;
}
interface ChannelPost {
  id: number;
  text: string;
  msg_type: string;
  media_url?: string;
  media_name?: string;
  views: number;
  ts: string;
  author: { display_name: string; avatar_color: string; avatar_initials: string; avatar_url?: string };
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light", accent: "blue", wallpaper: "plain",
  notifications: true, notifSound: true, notifPreview: true,
  language: "ru", region: "RU", fontSize: "md",
};

const LANGUAGES = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "kk", label: "Қазақша", flag: "🇰🇿" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
];
const REGIONS = [
  { code: "RU", label: "Россия", flag: "🇷🇺" },
  { code: "KZ", label: "Казахстан", flag: "🇰🇿" },
  { code: "BY", label: "Беларусь", flag: "🇧🇾" },
  { code: "UA", label: "Украина", flag: "🇺🇦" },
  { code: "US", label: "США", flag: "🇺🇸" },
  { code: "DE", label: "Германия", flag: "🇩🇪" },
  { code: "GB", label: "Великобритания", flag: "🇬🇧" },
  { code: "TR", label: "Турция", flag: "🇹🇷" },
  { code: "CN", label: "Китай", flag: "🇨🇳" },
  { code: "OTHER", label: "Другой", flag: "🌐" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("wc_token") || "";
async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if ((d.startsWith("7") || d.startsWith("8")) && d.length === 11) {
    const n = d.slice(1);
    return `+7 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`;
  }
  return raw;
}
function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return "Браузер";
}
function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Неизвестно";
}
function applyTheme(s: AppSettings) {
  const root = document.documentElement;
  const resolved = s.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : s.theme;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-accent", s.accent === "blue" ? "" : s.accent);
  root.setAttribute("data-wallpaper", s.wallpaper);
  root.style.fontSize = s.fontSize === "sm" ? "14px" : s.fontSize === "lg" ? "18px" : "16px";
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function OnboardingScreen({ onDone }: { onDone: (lang: string, region: string) => void }) {
  const [step, setStep] = useState<"welcome" | "language" | "terms">("welcome");
  const [lang, setLang] = useState("ru");
  const [region, setRegion] = useState("RU");
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {step === "welcome" && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
              <Icon name="Lock" size={44} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">WorChat</h1>
            <p className="text-muted-foreground text-sm mb-8">Защищённый мессенджер нового поколения</p>
            <div className="flex justify-center gap-6 mb-8">
              {[{ icon: "Shield", label: "E2E" }, { icon: "Zap", label: "Быстрый" }, { icon: "Globe", label: "Везде" }].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon name={f.icon} size={22} className="text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("language")}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Начать
            </button>
          </div>
        )}
        {step === "language" && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="Globe" size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">Язык и регион</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Язык</label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLang(l.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left
                        ${lang === l.code ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>
                      <span>{l.flag}</span><span className="truncate">{l.label}</span>
                      {lang === l.code && <Icon name="Check" size={13} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Регион</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {REGIONS.map(r => (
                    <button key={r.code} onClick={() => setRegion(r.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left
                        ${region === r.code ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>
                      <span>{r.flag}</span><span className="truncate">{r.label}</span>
                      {region === r.code && <Icon name="Check" size={13} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep("terms")}
              className="w-full mt-4 py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all">
              Продолжить
            </button>
          </div>
        )}
        {step === "terms" && (
          <div>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="FileText" size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">Пользовательское соглашение</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4 text-xs text-muted-foreground max-h-64 overflow-y-auto space-y-2 mb-4">
              <p className="font-semibold text-foreground">WorChat — Условия использования</p>
              <p>Настоящее Соглашение регулирует использование мессенджера WorChat в соответствии с законодательством РФ (ФЗ №149 «Об информации», ФЗ №152 «О персональных данных»).</p>
              <p>Все сообщения защищены сквозным шифрованием AES-512. Мы не имеем доступа к содержанию ваших переписок.</p>
              <p>Персональные данные обрабатываются строго в целях функционирования сервиса и не передаются третьим лицам без вашего согласия.</p>
              <p>Использование сервиса запрещено лицам младше 13 лет. Запрещено распространение незаконного контента.</p>
            </div>
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <div onClick={() => setAgreed(!agreed)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0
                  ${agreed ? "bg-primary border-primary" : "border-border"}`}>
                {agreed && <Icon name="Check" size={12} className="text-white" />}
              </div>
              <span className="text-sm text-muted-foreground">Я принимаю условия использования</span>
            </label>
            <button onClick={() => agreed && onDone(lang, region)} disabled={!agreed}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-40">
              Войти в WorChat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ display_name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setPhone(val.startsWith("8") ? "7" + val.slice(1) : val);
  };
  const displayPhone = () => formatPhone(phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { ok, data } = await apiFetch(AUTH_URL, {
      method: "POST",
      body: JSON.stringify({ action: mode, username: phone, ...form }),
    });
    setLoading(false);
    if (ok) { localStorage.setItem("wc_token", data.token); onAuth(data.user); }
    else setError(data.error || "Ошибка авторизации");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25">
            <Icon name="Lock" size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">WorChat</h1>
          <p className="text-sm text-muted-foreground mt-1">{mode === "login" ? "Войдите в аккаунт" : "Создайте аккаунт"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex mb-5 bg-muted rounded-xl p-0.5">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                  ${mode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {m === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Телефон</label>
              <div className="relative">
                <Icon name="Phone" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="tel" value={displayPhone()} onChange={handlePhone} placeholder="+7 (___) ___-__-__" required
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            {mode === "register" && (
              <div className="animate-fade-in">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Имя</label>
                <input type="text" value={form.display_name} onChange={e => set("display_name", e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Пароль</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="••••••" required autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm">
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 mt-1">
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Icon name="Lock" size={11} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Сквозное шифрование · WorChat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 44, dot = true }: { user: User; size?: number; dot?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.display_name}
          className="rounded-full object-cover w-full h-full" />
      ) : (
        <div className="rounded-full flex items-center justify-center text-white font-semibold w-full h-full"
          style={{ background: user.avatar_color, fontSize: size * 0.35 }}>
          {user.avatar_initials || user.display_name?.slice(0, 2).toUpperCase()}
        </div>
      )}
      {dot && user.status === "online" && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
      )}
    </div>
  );
}

// ─── Subscription badges ───────────────────────────────────────────────────────
function Badge({ plan, size = "sm" }: { plan: "standard" | "premium"; size?: "sm" | "lg" }) {
  const isPremium = plan === "premium";
  const gradient = isPremium
    ? "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)"
    : "linear-gradient(135deg, #0ea5e9, #06b6d4)";
  const label = isPremium ? "⭐ PREMIUM" : "✦ STANDARD";
  if (size === "lg") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
        style={{ background: gradient }}>{label}</div>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold"
      style={{ background: gradient }}>{label}</span>
  );
}

// ─── Reply Preview ────────────────────────────────────────────────────────────
function ReplyPreview({ msg }: { msg: Message }) {
  return (
    <div className="border-l-2 border-white/60 pl-2 mb-1.5 opacity-90">
      <p className="text-[11px] truncate max-w-[200px]">{msg.text || "[медиа]"}</p>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, allMessages }: { msg: Message; allMessages: Message[] }) {
  const reply = msg.reply_to_id ? allMessages.find(m => m.id === msg.reply_to_id) : null;
  const renderContent = () => {
    if (msg.msg_type === "image" && msg.media_url) return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <img src={msg.media_url} alt="фото" className="max-w-xs rounded-xl cursor-pointer"
          onClick={() => window.open(msg.media_url, "_blank")} />
        {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
      </div>
    );
    if (msg.msg_type === "video" && msg.media_url) return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <video src={msg.media_url} controls className="max-w-xs rounded-xl" />
        {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
      </div>
    );
    if (msg.msg_type === "audio" && msg.media_url) return (
      <div className="flex items-center gap-2 min-w-[200px]">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Icon name="Music" size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium truncate max-w-[140px]">{msg.media_name || "Аудио"}</p>
          <audio src={msg.media_url} controls className="w-full h-7 mt-0.5" />
        </div>
      </div>
    );
    if (msg.msg_type === "document" && msg.media_url) return (
      <a href={msg.media_url} target="_blank" rel="noreferrer"
        className="flex items-center gap-2 hover:opacity-80">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon name="FileText" size={20} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[160px]">{msg.media_name || "Документ"}</p>
          <p className="text-xs opacity-70">{msg.media_size ? formatBytes(msg.media_size) : "Файл"}</p>
        </div>
        <Icon name="Download" size={15} className="ml-auto opacity-60 shrink-0" />
      </a>
    );
    if (msg.msg_type === "geo" && msg.geo_lat !== undefined) return (
      <a href={`https://maps.google.com/?q=${msg.geo_lat},${msg.geo_lon}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-2 hover:opacity-80">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <Icon name="MapPin" size={20} className="text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium">Геопозиция</p>
          <p className="text-xs opacity-70">{msg.geo_lat?.toFixed(4)}, {msg.geo_lon?.toFixed(4)}</p>
        </div>
      </a>
    );
    if (msg.msg_type === "contact") return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Icon name="User" size={20} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium">{msg.contact_name}</p>
          <p className="text-xs opacity-70">{msg.contact_phone}</p>
        </div>
      </div>
    );
    return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <span className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</span>
      </div>
    );
  };
  return (
    <div>
      {renderContent()}
      <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.out ? "text-white/70" : "text-muted-foreground"}`}>
        <span className="text-[10px]">{msg.time}</span>
        {msg.out && <Icon name={msg.status === "read" ? "CheckCheck" : "Check"} size={12} />}
      </div>
    </div>
  );
}

// ─── Incoming Call Modal ──────────────────────────────────────────────────────
function IncomingCallModal({ call, onAnswer, onReject }: {
  call: CallSession;
  onAnswer: (type: "audio" | "video") => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-3xl shadow-2xl p-6 w-72 text-center animate-pop">
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
          {call.call_type === "video" ? "Входящий видеозвонок" : "Входящий звонок"}
        </p>
        <Avatar user={call.caller} size={72} dot={false} />
        <p className="font-bold text-lg mt-3 mb-1">{call.caller.display_name}</p>
        <p className="text-sm text-muted-foreground mb-6">Вас вызывают...</p>
        <div className="flex justify-center gap-6">
          <button onClick={onReject}
            className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-all">
            <Icon name="PhoneOff" size={24} className="text-white" />
          </button>
          <button onClick={() => onAnswer(call.call_type)}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-600 transition-all">
            <Icon name={call.call_type === "video" ? "Video" : "Phone"} size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active Call Screen ───────────────────────────────────────────────────────
function CallScreen({ partner, callType, roomId, isCallee, onEnd }: {
  partner: User;
  callType: "audio" | "video";
  roomId: string;
  isCallee: boolean;
  onEnd: () => void;
}) {
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(isCallee ? "Подключение..." : "Вызов...");
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const sendSignal = useCallback(async (type: string, data: unknown) => {
    await apiFetch(CALLS_URL, {
      method: "POST",
      body: JSON.stringify({ action: "signal", room_id: roomId, signal_type: type, signal_data: data }),
    });
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      // Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setStatus("Нет доступа к микрофону");
      }

      pc.ontrack = e => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          if (mounted) { setStatus("В сети"); }
        }
      };

      pc.onicecandidate = e => {
        if (e.candidate) sendSignal("ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") {
          setStatus("В сети");
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setStatus("Соединение прервано");
        }
      };

      if (!isCallee) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
      }

      // Poll signals
      pollRef.current = setInterval(async () => {
        if (!mounted) return;
        const { ok, data } = await apiFetch(`${CALLS_URL}?action=signals&room=${roomId}&since_id=${lastSigId.current}`);
        if (!ok) return;
        const { signals, status: cs } = data;
        if (cs === "ended") { onEnd(); return; }
        if (cs === "active" && status === "Вызов...") setStatus("Подключение...");
        for (const sig of (signals || [])) {
          lastSigId.current = Math.max(lastSigId.current, sig.id);
          if (sig.type === "offer" && isCallee) {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("answer", { sdp: answer.sdp, type: answer.type });
          }
          if (sig.type === "answer" && !isCallee) {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            }
          }
          if (sig.type === "ice") {
            try { await pc.addIceCandidate(new RTCIceCandidate(sig.data)); } catch { /* ignore */ }
          }
        }
      }, 1500);
    };
    start();
    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatDur = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = micMuted; });
    setMicMuted(m => !m);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
  };
  const toggleSpeaker = () => setSpeakerOff(s => !s);

  const handleEnd = async () => {
    await apiFetch(CALLS_URL, { method: "POST", body: JSON.stringify({ action: "end", room_id: roomId }) });
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-gradient-to-b from-gray-900 to-black">
      {/* Remote video (full screen) */}
      {callType === "video" && (
        <video ref={remoteVideoRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center pt-16 gap-3">
        <Avatar user={partner} size={88} dot={false} />
        <p className="text-white font-bold text-2xl mt-2">{partner.display_name}</p>
        <p className="text-white/70 text-sm">{status === "В сети" ? formatDur(duration) : status}</p>
      </div>

      {/* Local video pip */}
      {callType === "video" && (
        <div className="absolute top-4 right-4 z-20 w-28 h-36 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
          <video ref={localVideoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center gap-5">
        <button onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg
            ${micMuted ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
          <Icon name={micMuted ? "MicOff" : "Mic"} size={24} className="text-white" />
        </button>
        {callType === "video" && (
          <button onClick={toggleCam}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg
              ${camOff ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
            <Icon name={camOff ? "VideoOff" : "Video"} size={24} className="text-white" />
          </button>
        )}
        <button onClick={handleEnd}
          className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-xl hover:bg-destructive/90 transition-all">
          <Icon name="PhoneOff" size={28} className="text-white" />
        </button>
        <button onClick={toggleSpeaker}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg
            ${speakerOff ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
          <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={24} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({ user, settings, onSettings, onLogout, onAvatarUpload, avatarUploading, avatarInputRef }: {
  user: User; settings: AppSettings;
  onSettings: (s: AppSettings) => void;
  onLogout: () => void;
  onAvatarUpload: (f: File) => void;
  avatarUploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [tab, setTab] = useState<"profile" | "appearance" | "notifications" | "devices" | "language">("profile");
  const set = (p: Partial<AppSettings>) => onSettings({ ...settings, ...p });

  const accentColors = [
    { value: "blue" as Accent, color: "#1d6cc8", label: "Синий" },
    { value: "green" as Accent, color: "#22b865", label: "Зелёный" },
    { value: "purple" as Accent, color: "#8b5cf6", label: "Фиолетовый" },
    { value: "red" as Accent, color: "#ef4444", label: "Красный" },
    { value: "orange" as Accent, color: "#f97316", label: "Оранжевый" },
    { value: "pink" as Accent, color: "#ec4899", label: "Розовый" },
  ];
  const wallpapers = [
    { value: "plain" as Wallpaper, label: "Чистый", cls: "bg-muted" },
    { value: "dots" as Wallpaper, label: "Точки", cls: "chat-bg-dots" },
    { value: "grid" as Wallpaper, label: "Сетка", cls: "chat-bg-grid" },
    { value: "bubbles" as Wallpaper, label: "Пузыри", cls: "chat-bg-bubbles" },
  ];
  const tabs = [
    { id: "profile", icon: "User", label: "Профиль" },
    { id: "appearance", icon: "Palette", label: "Оформление" },
    { id: "notifications", icon: "Bell", label: "Уведомления" },
    { id: "devices", icon: "Monitor", label: "Устройства" },
    { id: "language", icon: "Globe", label: "Язык" },
  ] as const;
  const devices: DeviceInfo[] = [
    { name: `${detectOS()} · ${detectBrowser()}`, os: detectOS(), browser: detectBrowser(), current: true },
    { name: "iPhone 15 · Safari", os: "iOS", browser: "Safari", current: false },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-border shrink-0 scrollbar-none">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all
              ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {tab === "profile" && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <Avatar user={user} size={72} dot={false} />
                <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                  {avatarUploading
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon name="Camera" size={12} />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{user.display_name}</div>
                <div className="text-sm text-muted-foreground">{formatPhone(user.username)}</div>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {[
                { icon: "User", label: "Имя", value: user.display_name },
                { icon: "Phone", label: "Телефон", value: formatPhone(user.username) },
                { icon: "Shield", label: "Шифрование", value: "AES-512 E2E" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={row.icon} size={15} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="text-sm font-medium truncate">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 text-destructive text-sm font-medium">
              <Icon name="LogOut" size={16} />Выйти из аккаунта
            </button>
          </div>
        )}

        {tab === "appearance" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тема</p>
              <div className="grid grid-cols-3 gap-2">
                {([{ value: "light", icon: "Sun", label: "Светлая" }, { value: "dark", icon: "Moon", label: "Тёмная" }, { value: "system", icon: "Monitor", label: "Системная" }] as { value: Theme; icon: string; label: string }[]).map(t => (
                  <button key={t.value} onClick={() => set({ theme: t.value })}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all
                      ${settings.theme === t.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}>
                    <Icon name={t.icon} size={20} className={settings.theme === t.value ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-xs font-medium ${settings.theme === t.value ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Цвет акцента</p>
              <div className="grid grid-cols-6 gap-2">
                {accentColors.map(ac => (
                  <button key={ac.value} onClick={() => set({ accent: ac.value })} title={ac.label}
                    className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all
                      ${settings.accent === ac.value ? "border-foreground scale-105" : "border-transparent"}`}
                    style={{ background: ac.color }}>
                    {settings.accent === ac.value && <Icon name="Check" size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Фон чата</p>
              <div className="grid grid-cols-2 gap-2">
                {wallpapers.map(w => (
                  <button key={w.value} onClick={() => set({ wallpaper: w.value })}
                    className={`relative h-16 rounded-2xl border-2 overflow-hidden transition-all
                      ${settings.wallpaper === w.value ? "border-primary" : "border-border"}`}>
                    <div className={`absolute inset-0 ${w.cls}`} />
                    <div className="absolute inset-0 flex items-end p-2">
                      <span className="text-xs font-medium bg-white/80 rounded-lg px-2 py-0.5">{w.label}</span>
                    </div>
                    {settings.wallpaper === w.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Icon name="Check" size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Размер текста</p>
              <div className="grid grid-cols-3 gap-2">
                {([{ v: "sm", label: "Мелкий" }, { v: "md", label: "Средний" }, { v: "lg", label: "Крупный" }] as { v: "sm" | "md" | "lg"; label: string }[]).map(fs => (
                  <button key={fs.v} onClick={() => set({ fontSize: fs.v })}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                      ${settings.fontSize === fs.v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}>
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3 animate-fade-in">
            {[
              { k: "notifications", icon: "Bell", label: "Уведомления", sub: "Показывать уведомления о сообщениях" },
              { k: "notifSound", icon: "Volume2", label: "Звук", sub: "Воспроизводить звук при сообщении" },
              { k: "notifPreview", icon: "Eye", label: "Предпросмотр", sub: "Показывать текст в уведомлении" },
            ].map(item => (
              <div key={item.k} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={item.icon} size={17} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <button onClick={() => set({ [item.k]: !settings[item.k as keyof AppSettings] } as Partial<AppSettings>)}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0
                    ${settings[item.k as keyof AppSettings] ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                    ${settings[item.k as keyof AppSettings] ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "devices" && (
          <div className="space-y-2 animate-fade-in">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={d.os === "Android" || d.os === "iOS" ? "Smartphone" : "Monitor"} size={17} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.current ? "Текущий сеанс" : "Последний вход: 2 дня назад"}</p>
                </div>
                {d.current && <span className="text-xs text-green-500 font-medium shrink-0">Активен</span>}
              </div>
            ))}
          </div>
        )}

        {tab === "language" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Язык</p>
              <div className="space-y-1.5">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => set({ language: l.code })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left
                      ${settings.language === l.code ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
                    <span className="text-xl">{l.flag}</span>
                    <span className={`flex-1 text-sm font-medium ${settings.language === l.code ? "text-primary" : ""}`}>{l.label}</span>
                    {settings.language === l.code && <Icon name="Check" size={15} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Регион</p>
              <div className="space-y-1.5">
                {REGIONS.map(r => (
                  <button key={r.code} onClick={() => set({ region: r.code })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left
                      ${settings.region === r.code ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
                    <span className="text-xl">{r.flag}</span>
                    <span className={`flex-1 text-sm font-medium ${settings.region === r.code ? "text-primary" : ""}`}>{r.label}</span>
                    {settings.region === r.code && <Icon name="Check" size={15} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CreateChannelModal ────────────────────────────────────────────────────────
function CreateChannelModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, desc: string, isPublic: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Новый канал</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название канала *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Мой блог"
              className="w-full px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="О чём этот канал?" rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
            <div>
              <div className="text-sm font-medium">Публичный канал</div>
              <div className="text-xs text-muted-foreground">Виден всем пользователям</div>
            </div>
            <button onClick={() => setIsPublic(!isPublic)}
              className={`w-10 h-6 rounded-full transition-all relative ${isPublic ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all" style={{ left: isPublic ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Отмена</button>
          <button onClick={() => name.trim() && onCreate(name.trim(), desc, isPublic)} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditChannelModal ─────────────────────────────────────────────────────────
function EditChannelModal({ channel, onClose, onSave, onDelete, onUploadAvatar }: {
  channel: Channel;
  onClose: () => void;
  onSave: (id: number, fields: { name?: string; description?: string; is_public?: boolean }) => void;
  onDelete: (id: number) => void;
  onUploadAvatar: (file: File) => void;
}) {
  const [name, setName] = useState(channel.name);
  const [desc, setDesc] = useState(channel.description || "");
  const [isPublic, setIsPublic] = useState(channel.is_public);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUploadAvatar(file);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Редактировать канал</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden"
              style={{ background: channel.avatar_color }}>
              {channel.avatar_url ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" /> : channel.name.slice(0,2).toUpperCase()}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
              {uploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="Camera" size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <p className="text-xs text-muted-foreground">Нажмите для смены аватара</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
            <div>
              <div className="text-sm font-medium">Публичный</div>
              <div className="text-xs text-muted-foreground">Виден в поиске</div>
            </div>
            <button onClick={() => setIsPublic(!isPublic)}
              className={`w-10 h-6 rounded-full transition-all relative ${isPublic ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all" style={{ left: isPublic ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Отмена</button>
          <button onClick={() => onSave(channel.id, { name, description: desc, is_public: isPublic })}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            Сохранить
          </button>
        </div>

        {channel.role === "owner" && (
          <div className="border-t border-border pt-3">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">Удалить канал безвозвратно?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted">Нет</button>
                  <button onClick={() => onDelete(channel.id)} className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium">Удалить</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm">
                <Icon name="Trash2" size={15} />Удалить канал
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({
  plan, period, step, method, loading, paymentRef,
  cardNumber, cardExpiry, cardCvv, cardName,
  onSetPlan, onSetPeriod, onSetMethod,
  onSetCardNumber, onSetCardExpiry, onSetCardCvv, onSetCardName,
  onInitiate, onConfirm, onClose,
}: {
  plan: string; period: "month" | "year"; step: "select" | "form" | "success";
  method: "card" | "sbp"; loading: boolean; paymentRef: string;
  cardNumber: string; cardExpiry: string; cardCvv: string; cardName: string;
  onSetPlan: (p: string) => void; onSetPeriod: (p: "month" | "year") => void;
  onSetMethod: (m: "card" | "sbp") => void;
  onSetCardNumber: (v: string) => void; onSetCardExpiry: (v: string) => void;
  onSetCardCvv: (v: string) => void; onSetCardName: (v: string) => void;
  onInitiate: (plan: string, period: "month" | "year") => void;
  onConfirm: () => void; onClose: () => void;
}) {
  const PLAN_INFO: Record<string, { name: string; price_month: number; price_year: number; badge: string; color: string }> = {
    standard: { name: "Standard", price_month: 149, price_year: 1490, badge: "✦ STANDARD", color: "#0ea5e9" },
    premium: { name: "Premium", price_month: 499, price_year: 4990, badge: "⭐ PREMIUM", color: "#6366f1" },
  };
  const info = PLAN_INFO[plan] || PLAN_INFO.premium;
  const amount = period === "year" ? info.price_year : info.price_month;
  const periodLabel = period === "year" ? "год" : "месяц";

  const formatCard = (v: string) => v.replace(/\D/g,"").slice(0,16).replace(/(\d{4})/g,"$1 ").trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g,"").slice(0,4); return d.length > 2 ? d.slice(0,2)+"/"+d.slice(2) : d; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-base font-bold">
            {step === "select" ? "Оформить подписку" : step === "form" ? "Оплата" : "Готово!"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>

        {step === "select" && (
          <div className="px-6 pb-6 space-y-4">
            {/* Plan selector */}
            <div className="grid grid-cols-2 gap-2">
              {["standard","premium"].map(p => {
                const pi = PLAN_INFO[p];
                return (
                  <button key={p} onClick={() => onSetPlan(p)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${plan === p ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                    <div className="text-sm font-bold" style={{ color: pi.color }}>{pi.badge}</div>
                    <div className="text-xs text-muted-foreground mt-1">{pi.price_month}₽/мес</div>
                  </button>
                );
              })}
            </div>
            {/* Period selector */}
            <div className="grid grid-cols-2 gap-2">
              {([["month","1 месяц"],["year","1 год"]] as [string,string][]).map(([p, label]) => (
                <button key={p} onClick={() => onSetPeriod(p as "month"|"year")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${period === p ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{p === "year" ? PLAN_INFO[plan]?.price_year+"₽" : PLAN_INFO[plan]?.price_month+"₽"}
                    {p === "year" && <span className="ml-1 text-green-500 font-medium">-17%</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-muted/60 rounded-xl p-3 text-sm">
              <div className="font-semibold">{info.badge} · {periodLabel}</div>
              <div className="text-muted-foreground text-xs mt-0.5">Итого: {amount}₽</div>
            </div>
            <button onClick={() => onInitiate(plan, period)} disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Перейти к оплате — {amount}₽
            </button>
          </div>
        )}

        {step === "form" && (
          <div className="px-6 pb-6 space-y-4">
            <div className="bg-muted/60 rounded-xl p-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{info.badge}</div>
                <div className="text-xs text-muted-foreground">{periodLabel} · {amount}₽</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">{paymentRef}</div>
            </div>
            {/* Method tabs */}
            <div className="flex gap-2">
              {([["card","Карта"],["sbp","СБП"]] as [string,string][]).map(([m,label]) => (
                <button key={m} onClick={() => onSetMethod(m as "card"|"sbp")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2 ${method === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>
                  {label}
                </button>
              ))}
            </div>

            {method === "card" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Номер карты</label>
                  <input value={formatCard(cardNumber)} onChange={e => onSetCardNumber(e.target.value.replace(/\s/g,""))}
                    placeholder="0000 0000 0000 0000" maxLength={19}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Срок</label>
                    <input value={formatExpiry(cardExpiry)} onChange={e => onSetCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">CVV</label>
                    <input value={cardCvv} onChange={e => onSetCardCvv(e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="•••" maxLength={3} type="password"
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Имя на карте</label>
                  <input value={cardName} onChange={e => onSetCardName(e.target.value.toUpperCase())} placeholder="IVAN IVANOV"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                </div>
              </div>
            )}

            {method === "sbp" && (
              <div className="text-center py-4 space-y-3">
                <div className="w-32 h-32 bg-muted rounded-2xl mx-auto flex items-center justify-center">
                  <div className="text-4xl">📱</div>
                </div>
                <div className="text-sm text-muted-foreground">Откройте приложение банка и отсканируйте QR-код для оплаты через СБП</div>
                <div className="font-mono text-xs bg-muted rounded-lg px-3 py-2">{paymentRef}</div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
              <Icon name="Shield" size={11} />
              <span>Защищено TLS-шифрованием</span>
            </div>

            <button onClick={onConfirm} disabled={loading || (method === "card" && (cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3))}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Оплатить {amount}₽
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="px-6 pb-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <Icon name="CheckCircle" size={36} className="text-green-500" />
            </div>
            <div>
              <div className="font-bold text-lg">Оплата прошла!</div>
              <div className="text-sm text-muted-foreground mt-1">{info.badge} активирован на {periodLabel}</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">{paymentRef}</div>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90">
              Отлично!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Index() {
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem("wc_onboarded"));
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [section, setSection] = useState<Section>("chats");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchTab, setChatSearchTab] = useState<ChatSearchTab>("chats");
  const [peopleResults, setPeopleResults] = useState<User[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [sending, setSending] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [botMessages, setBotMessages] = useState<BotMessage[]>([]);
  const [botInput, setBotInput] = useState("");
  const [botSending, setBotSending] = useState(false);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [callHistory, setCallHistory] = useState<Record<string, unknown>[]>([]);
  const [activeCall, setActiveCall] = useState<{ partner: User; type: "audio" | "video"; roomId: string; isCallee: boolean } | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try { const s = localStorage.getItem("wc_settings"); return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS; }
    catch { return DEFAULT_SETTINGS; }
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channelPosts, setChannelPosts] = useState<ChannelPost[]>([]);
  const [channelPostsLoading, setChannelPostsLoading] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelSearchResults, setChannelSearchResults] = useState<Channel[]>([]);
  const [channelSearchLoading, setChannelSearchLoading] = useState(false);
  const [channelTab, setChannelTab] = useState<"all" | "my" | "search">("all");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [channelPostInput, setChannelPostInput] = useState("");
  const [channelPostSending, setChannelPostSending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<string>("premium");
  const [paymentPeriod, setPaymentPeriod] = useState<"month" | "year">("month");
  const [paymentStep, setPaymentStep] = useState<"select" | "form" | "success">("select");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sbp">("card");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botEndRef = useRef<HTMLDivElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { applyTheme(settings); }, [settings]);

  const updateSettings = useCallback((s: AppSettings) => {
    setSettings(s); localStorage.setItem("wc_settings", JSON.stringify(s)); applyTheme(s);
  }, []);

  // Auth check
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecked(true); return; }
    apiFetch(AUTH_URL).then(({ ok, data }) => {
      if (ok) setUser(data.user); else localStorage.removeItem("wc_token");
      setAuthChecked(true);
    });
  }, []);

  const loadChats = useCallback(async () => {
    const { ok, data } = await apiFetch(`${CHATS_URL}?action=chats`);
    if (ok) setChats(data.chats || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    setChatsLoading(true);
    loadChats().finally(() => setChatsLoading(false));
    chatsPollRef.current = setInterval(loadChats, 5000);
    return () => { if (chatsPollRef.current) clearInterval(chatsPollRef.current); };
  }, [user, loadChats]);

  const loadContacts = useCallback(async () => {
    const { ok, data } = await apiFetch(`${CHATS_URL}?action=contacts`);
    if (ok) setContacts(data.contacts || []);
  }, []);

  useEffect(() => {
    if (user && (section === "contacts" || section === "search")) loadContacts();
  }, [user, section, loadContacts]);

  const loadMessages = useCallback(async (chatId: number) => {
    const { ok, data } = await apiFetch(`${MESSAGES_URL}?chat_id=${chatId}`);
    if (ok) setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    setMsgsLoading(true);
    loadMessages(activeChat.chat_id).finally(() => setMsgsLoading(false));
    msgsPollRef.current = setInterval(() => loadMessages(activeChat.chat_id), 3000);
    return () => { if (msgsPollRef.current) clearInterval(msgsPollRef.current); };
  }, [activeChat, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { botEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [botMessages]);

  const loadBotHistory = useCallback(async () => {
    const { ok, data } = await apiFetch(`${BOT_URL}?action=history`);
    if (ok) setBotMessages(data.messages || []);
  }, []);

  const loadSubscription = useCallback(async () => {
    const { ok, data } = await apiFetch(`${BOT_URL}?action=subscription`);
    if (ok) setSubscription(data.subscription);
  }, []);

  useEffect(() => {
    if (user && activeBotId === "worchat_bot") {
      loadBotHistory(); loadSubscription();
    }
  }, [user, activeBotId, loadBotHistory, loadSubscription]);

  // Incoming call poll
  useEffect(() => {
    if (!user || !CALLS_URL) return;
    callPollRef.current = setInterval(async () => {
      if (activeCall) return;
      const { ok, data } = await apiFetch(`${CALLS_URL}?action=incoming`);
      if (ok && data.call) setIncomingCall(data.call);
    }, 3000);
    return () => { if (callPollRef.current) clearInterval(callPollRef.current); };
  }, [user, activeCall]);

  // Load call history
  const loadCallHistory = useCallback(async () => {
    if (!CALLS_URL) return;
    const { ok, data } = await apiFetch(`${CALLS_URL}?action=history`);
    if (ok) setCallHistory(data.history || []);
  }, []);

  useEffect(() => {
    if (user && section === "calls") loadCallHistory();
  }, [user, section, loadCallHistory]);

  useEffect(() => {
    if (user && section === "channels") loadChannels(channelTab as "all" | "my");
  }, [user, section, channelTab, loadChannels]);

  const logout = async () => {
    await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "logout" }) });
    localStorage.removeItem("wc_token");
    setUser(null); setChats([]); setContacts([]); setActiveChat(null); setMessages([]);
  };

  const openChat = (chat: ChatItem) => {
    setActiveChat(chat); setReplyTo(null); setShowAttach(false); setChatMenuOpen(false); setMobileView("chat");
  };

  const startChatWithContact = async (contact: User) => {
    const { ok, data } = await apiFetch(CHATS_URL, {
      method: "POST", body: JSON.stringify({ action: "start", partner_id: contact.id }),
    });
    if (!ok) return;
    const res = await apiFetch(`${CHATS_URL}?action=chats`);
    if (res.ok) {
      const updated: ChatItem[] = res.data.chats || [];
      setChats(updated);
      const found = updated.find(c => c.chat_id === data.chat_id);
      if (found) { setSection("chats"); setSearchQuery(""); openChat(found); }
    }
  };

  const searchPeople = useCallback(async (query: string) => {
    if (!query.trim()) { setPeopleResults([]); return; }
    setPeopleLoading(true);
    const { ok, data } = await apiFetch(`${CHATS_URL}?action=search_users&q=${encodeURIComponent(query.trim())}`);
    if (ok) setPeopleResults(data.users || []);
    else setPeopleResults([]);
    setPeopleLoading(false);
  }, []);

  const loadChannels = useCallback(async (tab: "all" | "my" = "all") => {
    if (!CHANNELS_URL) return;
    setChannelsLoading(true);
    const action = tab === "my" ? "my" : "list";
    const { ok, data } = await apiFetch(`${CHANNELS_URL}?action=${action}`);
    if (ok) setChannels(data.channels || []);
    setChannelsLoading(false);
  }, []);

  const searchChannels = useCallback(async (q: string) => {
    if (!q.trim() || !CHANNELS_URL) { setChannelSearchResults([]); return; }
    setChannelSearchLoading(true);
    const { ok, data } = await apiFetch(`${CHANNELS_URL}?action=search&q=${encodeURIComponent(q)}`);
    if (ok) setChannelSearchResults(data.channels || []);
    setChannelSearchLoading(false);
  }, []);

  const loadChannelPosts = useCallback(async (channelId: number) => {
    if (!CHANNELS_URL) return;
    setChannelPostsLoading(true);
    const { ok, data } = await apiFetch(`${CHANNELS_URL}?action=posts&id=${channelId}`);
    if (ok) setChannelPosts(data.posts || []);
    setChannelPostsLoading(false);
  }, []);

  const openChannel = (ch: Channel) => {
    setActiveChannel(ch);
    setChannelPosts([]);
    loadChannelPosts(ch.id);
    setMobileView("chat");
  };

  const subscribeChannel = async (ch: Channel) => {
    if (!CHANNELS_URL) return;
    const { ok, data } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "subscribe", channel_id: ch.id }),
    });
    if (ok) {
      setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, subscribed: data.subscribed, members_count: c.members_count + (data.subscribed ? 1 : -1) } : c));
      if (activeChannel?.id === ch.id) setActiveChannel(prev => prev ? { ...prev, subscribed: data.subscribed } : prev);
    }
  };

  const postToChannel = async () => {
    if (!activeChannel || !channelPostInput.trim() || channelPostSending) return;
    setChannelPostSending(true);
    const { ok, data } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "post", channel_id: activeChannel.id, text: channelPostInput.trim() }),
    });
    if (ok) {
      setChannelPosts(prev => [data.post, ...prev]);
      setChannelPostInput("");
    }
    setChannelPostSending(false);
  };

  const deleteChannelPost = async (postId: number) => {
    if (!activeChannel || !CHANNELS_URL) return;
    const { ok } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "delete_post", post_id: postId, channel_id: activeChannel.id }),
    });
    if (ok) setChannelPosts(prev => prev.filter(p => p.id !== postId));
  };

  const createChannel = async (name: string, description: string, isPublic: boolean) => {
    if (!name.trim() || !CHANNELS_URL) return;
    const { ok, data } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "create", name, description, is_public: isPublic }),
    });
    if (ok) {
      setShowCreateChannel(false);
      setChannels(prev => [data.channel, ...prev]);
      openChannel(data.channel);
    }
  };

  const updateChannel = async (channelId: number, fields: { name?: string; description?: string; avatar_url?: string; is_public?: boolean }) => {
    if (!CHANNELS_URL) return;
    const { ok, data } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "update", channel_id: channelId, ...fields }),
    });
    if (ok && data.channel) {
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, ...data.channel } : c));
      setActiveChannel(prev => prev?.id === channelId ? { ...prev, ...data.channel } : prev);
      setShowEditChannel(false);
    }
  };

  const deleteChannel = async (channelId: number) => {
    if (!CHANNELS_URL) return;
    const { ok } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "delete", channel_id: channelId }),
    });
    if (ok) {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      setActiveChannel(null);
      setMobileView("list");
    }
  };

  const initiatePayment = async (plan: string, period: "month" | "year") => {
    setPaymentLoading(true);
    const { ok, data } = await apiFetch(BOT_URL, {
      method: "POST", body: JSON.stringify({ action: "create_payment", plan, period }),
    });
    if (ok) {
      setPaymentRef(data.payment.ref);
      setPaymentStep("form");
    }
    setPaymentLoading(false);
  };

  const confirmPayment = async () => {
    setPaymentLoading(true);
    const { ok } = await apiFetch(BOT_URL, {
      method: "POST", body: JSON.stringify({ action: "confirm_payment", plan: paymentPlan, period: paymentPeriod, payment_ref: paymentRef }),
    });
    if (ok) {
      setPaymentStep("success");
      await loadSubscription();
    }
    setPaymentLoading(false);
  };

  const sendMessage = async (overrides?: Partial<Message>) => {
    if (!activeChat || sending) return;
    const text = input.trim();
    if (!overrides && !text) return;
    setInput(""); setReplyTo(null); setShowAttach(false); setSending(true);
    const payload: Record<string, unknown> = {
      action: "send", chat_id: activeChat.chat_id, msg_type: "text", text,
      ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      ...(overrides || {}),
    };
    await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify(payload) });
    await loadMessages(activeChat.chat_id);
    await loadChats();
    setSending(false);
  };

  const handleFileUpload = async (file: File, type: string) => {
    if (!activeChat) return;
    setShowAttach(false); setUploadingMedia(true);
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type, mime: file.type, data: b64, name: file.name }),
    });
    if (ok) {
      await sendMessage({ msg_type: type, media_url: data.url, media_name: file.name, media_size: file.size, text: "" });
    }
    setUploadingMedia(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST", body: JSON.stringify({ type: "avatar", mime: file.type, data: b64, name: file.name }),
    });
    if (ok && user) setUser({ ...user, avatar_url: data.url });
    setAvatarUploading(false);
  };

  const sendGeo = () => {
    if (!activeChat) return;
    navigator.geolocation.getCurrentPosition(
      pos => sendMessage({ msg_type: "geo", geo_lat: pos.coords.latitude, geo_lon: pos.coords.longitude, text: "" }),
      () => alert("Нет доступа к геолокации"),
    );
  };

  const deleteChat = async () => {
    if (!activeChat) return;
    setDeletingChat(true); setChatMenuOpen(false);
    await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify({ action: "delete_chat", chat_id: activeChat.chat_id }) });
    setMessages([]); setChats(p => p.filter(c => c.chat_id !== activeChat.chat_id));
    setActiveChat(null); setMobileView("list"); setDeletingChat(false);
  };

  const clearChat = async () => {
    if (!activeChat) return;
    setChatMenuOpen(false);
    await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify({ action: "clear_chat", chat_id: activeChat.chat_id }) });
    setMessages([]); loadChats();
  };

  const sendBotMessage = async () => {
    const text = botInput.trim();
    if (!text || botSending) return;
    setBotInput(""); setBotSending(true);
    setBotMessages(prev => [...prev, {
      id: Date.now(), role: "user" as const, text,
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    }]);
    const { ok, data } = await apiFetch(BOT_URL, { method: "POST", body: JSON.stringify({ action: "send", text }) });
    if (ok) {
      const reply = data.reply;
      setBotMessages(prev => [...prev, {
        id: Date.now() + 1, role: "bot" as const, text: reply.text,
        extra: reply.type !== "text" ? { type: reply.type, plan: reply.plan } : undefined,
        time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      }]);
      if (reply.type === "subscription_offer") loadSubscription();
    }
    setBotSending(false);
  };

  const paySubscription = (plan: string) => {
    setPaymentPlan(plan);
    setPaymentPeriod("month");
    setPaymentStep("select");
    setShowPayment(true);
  };

  const startCall = async (partner: User, type: "audio" | "video") => {
    if (!CALLS_URL) return;
    const { ok, data } = await apiFetch(CALLS_URL, {
      method: "POST", body: JSON.stringify({ action: "initiate", callee_id: partner.id, call_type: type }),
    });
    if (ok) setActiveCall({ partner, type, roomId: data.room_id, isCallee: false });
  };

  const answerCall = async (call: CallSession) => {
    if (!CALLS_URL) return;
    await apiFetch(CALLS_URL, { method: "POST", body: JSON.stringify({ action: "answer", room_id: call.room_id }) });
    setIncomingCall(null);
    setActiveCall({ partner: call.caller, type: call.call_type, roomId: call.room_id, isCallee: true });
  };

  const rejectCall = async (call: CallSession) => {
    if (!CALLS_URL) return;
    await apiFetch(CALLS_URL, { method: "POST", body: JSON.stringify({ action: "reject", room_id: call.room_id }) });
    setIncomingCall(null);
  };

  const filteredChats = chats.filter(c => c.partner.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredContacts = contacts.filter(c =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const chatBgClass = settings.wallpaper === "dots" ? "chat-bg-dots"
    : settings.wallpaper === "grid" ? "chat-bg-grid"
    : settings.wallpaper === "bubbles" ? "chat-bg-bubbles"
    : "chat-bg";

  // Onboarding
  if (!onboardingDone) {
    return <OnboardingScreen onDone={(lang, region) => {
      localStorage.setItem("wc_onboarded", "1");
      updateSettings({ ...settings, language: lang, region });
      setOnboardingDone(true);
    }} />;
  }
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }
  if (!user) return <AuthScreen onAuth={setUser} />;

  const navItems: { id: Section; icon: string; label: string }[] = [
    { id: "chats", icon: "MessageSquare", label: "Чаты" },
    { id: "channels", icon: "Rss", label: "Каналы" },
    { id: "bots", icon: "Bot", label: "Боты" },
    { id: "calls", icon: "Phone", label: "Звонки" },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Incoming call */}
      {incomingCall && !activeCall && (
        <IncomingCallModal call={incomingCall}
          onAnswer={answerCall.bind(null, incomingCall)}
          onReject={() => rejectCall(incomingCall)} />
      )}

      {/* Active call */}
      {activeCall && (
        <CallScreen
          partner={activeCall.partner}
          callType={activeCall.type}
          roomId={activeCall.roomId}
          isCallee={activeCall.isCallee}
          onEnd={() => { setActiveCall(null); loadCallHistory(); }}
        />
      )}

      {/* ── Desktop sidebar ── */}
      <div className="w-16 flex-col items-center py-3 gap-1 border-r border-border bg-card shrink-0 hidden md:flex">
        <button onClick={() => setSection("profile")} title="Профиль"
          className={`w-11 h-11 rounded-2xl overflow-hidden transition-all mb-1 shrink-0
            ${section === "profile" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-muted-foreground/30"}`}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: user.avatar_color }}>
                {user.avatar_initials || user.display_name.slice(0, 2).toUpperCase()}
              </div>
          }
        </button>
        {navItems.map(item => (
          <button key={item.id}
            onClick={() => { setSection(item.id); if (item.id !== "chats") { setActiveChat(null); setMobileView("list"); } }}
            title={item.label}
            className={`relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all
              ${section === item.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon name={item.icon} size={20} />
            {item.id === "chats" && totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Left panel ── */}
      <div className={`w-full md:w-80 flex flex-col border-r border-border bg-card shrink-0
        ${mobileView === "chat" && activeChat ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          {/* Mobile: avatar top-left */}
          <button className="md:hidden mr-2" onClick={() => setSection("profile")}>
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: user.avatar_color }}>
                    {user.avatar_initials || user.display_name.slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
          </button>
          <h2 className="text-base font-bold text-foreground">
            {section === "profile" ? "Профиль" : navItems.find(n => n.id === section)?.label || "WorChat"}
          </h2>
          <div className="flex items-center gap-1">
            {section === "chats" && (
              <button onClick={() => setSection("contacts")}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Icon name="PenSquare" size={17} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden overflow-x-auto gap-1 px-3 py-2 border-b border-border scrollbar-none shrink-0">
          {navItems.map(item => (
            <button key={item.id}
              onClick={() => { setSection(item.id); if (item.id !== "chats") { setActiveChat(null); setMobileView("list"); } }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0
                ${section === item.id ? "bg-primary text-white" : "text-muted-foreground bg-muted/50"}`}>
              <Icon name={item.icon} size={13} />{item.label}
              {item.id === "chats" && totalUnread > 0 && (
                <span className="min-w-4 h-4 px-1 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar + tabs */}
        {section === "chats" && (
          <div className="px-4 pt-2 pb-0 shrink-0">
            <div className="relative mb-2">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQuery}
                onChange={e => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  if (chatSearchTab === "people") searchPeople(q);
                }}
                placeholder={chatSearchTab === "chats" ? "Поиск чатов..." : "ID или логин пользователя..."}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setPeopleResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
            <div className="flex gap-1 mb-1">
              {([["chats", "Чаты"], ["people", "Люди"]] as [ChatSearchTab, string][]).map(([id, label]) => (
                <button key={id}
                  onClick={() => { setChatSearchTab(id); setSearchQuery(""); setPeopleResults([]); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${chatSearchTab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">

          {/* SETTINGS */}
          {section === "settings" && (
            <SettingsScreen user={user} settings={settings} onSettings={updateSettings} onLogout={logout}
              onAvatarUpload={handleAvatarUpload} avatarUploading={avatarUploading}
              avatarInputRef={avatarInputRef as React.RefObject<HTMLInputElement>} />
          )}

          {/* PROFILE */}
          {section === "profile" && (
            <div className="px-4 py-4 space-y-3 animate-fade-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <Avatar user={user} size={80} dot={false} />
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                    {avatarUploading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name="Camera" size={14} />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground">{formatPhone(user.username)}</div>
                  {subscription && <Badge plan={(subscription.plan as "standard" | "premium") || "standard"} size="lg" />}
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                {[
                  { icon: "User", label: "Имя", value: user.display_name },
                  { icon: "Phone", label: "Телефон", value: formatPhone(user.username) },
                  { icon: "Shield", label: "Шифрование", value: "AES-512 E2E" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon name={row.icon} size={15} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{row.label}</div>
                      <div className="text-sm font-medium truncate">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 text-destructive text-sm font-medium">
                <Icon name="LogOut" size={16} />Выйти из аккаунта
              </button>
            </div>
          )}

          {/* CHATS */}
          {section === "chats" && chatSearchTab === "chats" && (
            <div>
              {chatsLoading && chats.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!chatsLoading && chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground px-4 text-center">
                  <Icon name="MessageSquare" size={36} className="opacity-20" />
                  <p className="text-sm">Нет чатов. Перейдите в «Контакты».</p>
                  <button onClick={() => setSection("contacts")}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium">
                    Найти собеседника
                  </button>
                </div>
              )}
              {searchQuery && filteredChats.length === 0 && chats.length > 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Чаты не найдены</div>
              )}
              {filteredChats.map((c, i) => (
                <button key={c.chat_id} onClick={() => openChat(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left animate-fade-in
                    ${activeChat?.chat_id === c.chat_id ? "bg-primary/[0.07] border-r-2 border-primary" : ""}`}
                  style={{ animationDelay: `${i * 25}ms` }}>
                  <Avatar user={c.partner} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{c.partner.display_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.last_time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {c.last_text ? (c.last_sender_id === user.id ? `Вы: ${c.last_text}` : c.last_text) : "Нет сообщений"}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-2 shrink-0 min-w-5 h-5 px-1.5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PEOPLE SEARCH */}
          {section === "chats" && chatSearchTab === "people" && (
            <div className="px-4 py-2">
              {!searchQuery && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-center">
                  <Icon name="UserSearch" size={36} className="opacity-20" />
                  <p className="text-sm">Введите ID или логин<br/>чтобы найти человека</p>
                </div>
              )}
              {searchQuery && peopleLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {searchQuery && !peopleLoading && peopleResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Пользователи не найдены</div>
              )}
              {peopleResults.map(u => (
                <button key={u.id} onClick={() => startChatWithContact(u)}
                  className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left">
                  <Avatar user={u} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                  <Icon name="MessageCircle" size={16} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* CONTACTS */}
          {section === "contacts" && (
            <div className="px-4 py-2">
              {contacts.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {(["online", "offline"] as const).map(st => {
                const list = filteredContacts.filter(c => c.status === st);
                if (!list.length) return null;
                return (
                  <div key={st}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1.5">
                      {st === "online" ? `Онлайн · ${list.length}` : `Не в сети · ${list.length}`}
                    </div>
                    {list.map(c => (
                      <button key={c.id} onClick={() => startChatWithContact(c)}
                        className={`w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left ${st === "offline" ? "opacity-55" : ""}`}>
                        <Avatar user={c} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{c.display_name}</div>
                          <div className="text-xs text-muted-foreground">+{c.username}</div>
                        </div>
                        <Icon name="MessageCircle" size={15} className="ml-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}


          {/* CALLS */}
          {section === "calls" && (
            <div className="px-4 py-2">
              {callHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Icon name="PhoneOff" size={36} className="opacity-20" />
                  <p className="text-sm">История звонков пуста</p>
                </div>
              )}
              {callHistory.map((call: Record<string, unknown>, i) => {
                const isOut = (call as Record<string, unknown>).outgoing as boolean;
                const partner = (isOut ? (call as Record<string, unknown>).callee : (call as Record<string, unknown>).caller) as User;
                const callType = (call as Record<string, unknown>).call_type as string;
                const status = (call as Record<string, unknown>).status as string;
                return (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <Avatar user={partner} size={44} dot={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{partner?.display_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Icon name={isOut ? "PhoneOutgoing" : "PhoneIncoming"} size={12}
                          className={status === "rejected" || status === "ended" && !isOut ? "text-destructive" : "text-green-500"} />
                        <span className="text-xs text-muted-foreground">
                          {isOut ? "Исходящий" : "Входящий"} · {callType === "video" ? "Видео" : "Аудио"}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => CALLS_URL && startCall(partner, callType as "audio" | "video")}
                      className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
                      <Icon name={callType === "video" ? "Video" : "Phone"} size={17} className="text-primary" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* CHANNELS */}
          {section === "channels" && (
            <div>
              {/* Tabs */}
              <div className="flex gap-1 px-4 py-2 border-b border-border">
                {([["all","Все"],["my","Мои"],["search","Поиск"]] as [string,string][]).map(([id,label]) => (
                  <button key={id} onClick={() => { setChannelTab(id as "all"|"my"|"search"); setChannelSearchQuery(""); setChannelSearchResults([]); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${channelTab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              {channelTab === "search" && (
                <div className="px-4 py-2">
                  <div className="relative">
                    <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={channelSearchQuery}
                      onChange={e => { setChannelSearchQuery(e.target.value); searchChannels(e.target.value); }}
                      placeholder="Название канала..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus />
                  </div>
                </div>
              )}

              {/* Channel list */}
              <div>
                {channelsLoading && (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                )}
                {channelSearchLoading && channelTab === "search" && (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                )}
                {(() => {
                  const list = channelTab === "search" ? channelSearchResults : channels;
                  if (!channelsLoading && !channelSearchLoading && list.length === 0 && channelTab !== "search") {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-center px-4">
                        <Icon name="Rss" size={36} className="opacity-20" />
                        <p className="text-sm">{channelTab === "my" ? "У вас нет каналов" : "Каналов пока нет"}</p>
                      </div>
                    );
                  }
                  if (channelTab === "search" && channelSearchQuery && !channelSearchLoading && channelSearchResults.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground text-sm">Ничего не найдено</div>;
                  }
                  if (channelTab === "search" && !channelSearchQuery) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-center px-4">
                        <Icon name="Search" size={36} className="opacity-20" />
                        <p className="text-sm">Введите название канала</p>
                      </div>
                    );
                  }
                  return list.map((ch, i) => (
                    <button key={ch.id} onClick={() => openChannel(ch)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left animate-fade-in
                        ${activeChannel?.id === ch.id ? "bg-primary/[0.07] border-r-2 border-primary" : ""}`}
                      style={{ animationDelay: `${i * 20}ms` }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden"
                        style={{ background: ch.avatar_color }}>
                        {ch.avatar_url ? <img src={ch.avatar_url} alt="" className="w-full h-full object-cover" /> : ch.name.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">{ch.name}</span>
                          {!ch.is_public && <Icon name="Lock" size={11} className="text-muted-foreground shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{ch.description || "Канал"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{ch.members_count >= 1000 ? `${(ch.members_count/1000).toFixed(1)}K` : ch.members_count}</div>
                    </button>
                  ));
                })()}
              </div>

              {/* Create button */}
              <div className="px-4 py-3 border-t border-border mt-2">
                <button onClick={() => setShowCreateChannel(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:bg-muted/60 transition-colors text-muted-foreground text-sm">
                  <Icon name="Plus" size={16} />Создать канал
                </button>
              </div>
            </div>
          )}

          {/* BOTS list */}
          {section === "bots" && !activeBotId && (
            <div className="px-4 py-2">
              <button onClick={() => setActiveBotId("worchat_bot")}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 relative"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                  <Icon name="Bot" size={22} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">WorChat Bot</span>
                    <Badge plan="premium" />
                  </div>
                  <div className="text-xs text-muted-foreground">Подписки · Помощь · Поддержка</div>
                </div>
                <Icon name="ChevronRight" size={15} className="text-muted-foreground shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className={`flex-1 flex flex-col ${mobileView === "list" && !activeChat ? "hidden md:flex" : "flex"}`}>

        {/* CHANNEL screen */}
        {section === "channels" && activeChannel && (
          <div className="flex flex-col h-full">
            {/* Channel header */}
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-card shrink-0">
              <button onClick={() => { setActiveChannel(null); setMobileView("list"); }}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
                style={{ background: activeChannel.avatar_color }}>
                {activeChannel.avatar_url ? <img src={activeChannel.avatar_url} alt="" className="w-full h-full object-cover" /> : activeChannel.name.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{activeChannel.name}</span>
                  {!activeChannel.is_public && <Icon name="Lock" size={12} className="text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground">{activeChannel.members_count.toLocaleString()} подписчиков</div>
              </div>
              <div className="flex items-center gap-1">
                {activeChannel.role === "owner" || activeChannel.role === "admin" ? (
                  <button onClick={() => setShowEditChannel(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                    <Icon name="Settings" size={17} className="text-muted-foreground" />
                  </button>
                ) : (
                  <button onClick={() => subscribeChannel(activeChannel)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                      ${activeChannel.subscribed ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive" : "bg-primary text-white hover:bg-primary/90"}`}>
                    {activeChannel.subscribed ? "Отписаться" : "Подписаться"}
                  </button>
                )}
              </div>
            </div>

            {/* Channel info banner */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border shrink-0 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden"
                style={{ background: activeChannel.avatar_color }}>
                {activeChannel.avatar_url ? <img src={activeChannel.avatar_url} alt="" className="w-full h-full object-cover" /> : activeChannel.name.slice(0,2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-base">{activeChannel.name}</div>
                {activeChannel.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activeChannel.description}</div>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{activeChannel.members_count.toLocaleString()} подписчиков</span>
                  <span className="text-xs text-muted-foreground">{activeChannel.is_public ? "Публичный" : "Приватный"}</span>
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {channelPostsLoading && (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              )}
              {!channelPostsLoading && channelPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Icon name="FileText" size={40} className="opacity-20" />
                  <p className="text-sm">Постов пока нет</p>
                </div>
              )}
              {channelPosts.map(post => (
                <div key={post.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden"
                        style={{ background: post.author.avatar_color }}>
                        {post.author.avatar_url ? <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" /> : post.author.avatar_initials}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{activeChannel.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{post.ts}</span>
                      {(activeChannel.role === "owner" || activeChannel.role === "admin") && (
                        <button onClick={() => deleteChannelPost(post.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Icon name="Trash2" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.text}</p>
                  {post.media_url && (
                    <div className="mt-2">
                      {post.msg_type === "image" ? (
                        <img src={post.media_url} alt="" className="rounded-xl max-h-60 object-cover w-full" />
                      ) : (
                        <a href={post.media_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-muted rounded-xl text-sm hover:bg-muted/80">
                          <Icon name="Paperclip" size={14} />
                          <span className="truncate">{post.media_name || "Файл"}</span>
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Icon name="Eye" size={11} />
                    <span>{post.views}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Post input (owner/admin only) */}
            {(activeChannel.role === "owner" || activeChannel.role === "admin") && (
              <div className="px-4 py-3 border-t border-border bg-card shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={channelPostInput}
                    onChange={e => setChannelPostInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postToChannel(); }}
                    placeholder="Написать пост..."
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <button onClick={postToChannel} disabled={!channelPostInput.trim() || channelPostSending}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-all shrink-0">
                    {channelPostSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="Send" size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter для отправки</p>
              </div>
            )}
          </div>
        )}

        {/* BOT screen */}
        {section === "bots" && activeBotId === "worchat_bot" && (
          <>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-card shrink-0">
              <button onClick={() => setActiveBotId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                <Icon name="Bot" size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">WorChat Bot</div>
                <div className="text-xs text-green-500">Онлайн</div>
              </div>
              {subscription && <Badge plan={(subscription.plan as "standard" | "premium") || "standard"} size="sm" />}
            </div>

            <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${chatBgClass}`}>
              {botMessages.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {botMessages.map(bm => {
                const extra = bm.extra as Record<string, unknown> | undefined;

                // Subscription offer card
                if (bm.role === "bot" && extra?.type === "subscription_offer") {
                  const planId = extra.plan as string;
                  return (
                    <div key={bm.id} className="flex justify-start">
                      <div className="max-w-xs bg-card border border-border rounded-2xl p-4 shadow-sm animate-fade-in">
                        <p className="text-sm text-foreground mb-3 whitespace-pre-wrap leading-relaxed">{bm.text}</p>
                        {!subscription ? (
                          <button onClick={() => paySubscription(planId)}
                            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
                            style={{ background: planId === "premium" ? "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" : "linear-gradient(135deg,#0ea5e9,#06b6d4)" }}>
                            {planId === "premium" ? "Оформить Premium — 499₽/мес" : "Оформить Standard — 149₽/мес"}
                          </button>
                        ) : (
                          <div className="text-center text-sm text-green-600 font-medium">✓ Подписка активна</div>
                        )}
                        <div className={`text-[10px] mt-2 text-right text-muted-foreground`}>{bm.time}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={bm.id} className={`flex ${bm.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-3.5 py-2.5 rounded-2xl text-sm ${bm.role === "user" ? "msg-out rounded-br-sm" : "msg-in rounded-bl-sm shadow-sm border border-border"}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{bm.text}</p>
                      <div className={`text-[10px] mt-0.5 text-right ${bm.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>{bm.time}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={botEndRef} />
            </div>

            <div className="px-4 py-3 bg-card border-t border-border shrink-0">
              <div className="flex items-center gap-2">
                <input value={botInput} onChange={e => setBotInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBotMessage(); } }}
                  placeholder="Написать боту..."
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={sendBotMessage} disabled={!botInput.trim() || botSending}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all
                    ${botInput.trim() && !botSending ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground"}`}>
                  {botSending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon name="Send" size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* CHAT screen */}
        {activeChat && (
          <>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-card shrink-0">
              <button onClick={() => setMobileView("list")}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
              </button>
              <Avatar user={activeChat.partner} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{activeChat.partner.display_name}</div>
                <div className={`text-xs ${activeChat.partner.status === "online" ? "text-green-500" : "text-muted-foreground"}`}>
                  {activeChat.partner.status === "online" ? "В сети" : "Не в сети"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => CALLS_URL && startCall(activeChat.partner, "audio")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Аудиозвонок">
                  <Icon name="Phone" size={17} className="text-muted-foreground" />
                </button>
                <button onClick={() => CALLS_URL && startCall(activeChat.partner, "video")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Видеозвонок">
                  <Icon name="Video" size={17} className="text-muted-foreground" />
                </button>
                <div className="relative">
                  <button onClick={() => setChatMenuOpen(!chatMenuOpen)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                    <Icon name="MoreVertical" size={17} className="text-muted-foreground" />
                  </button>
                  {chatMenuOpen && (
                    <div className="absolute right-0 top-10 w-48 bg-card border border-border rounded-2xl shadow-lg z-50 py-1 animate-pop">
                      <button onClick={clearChat}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <Icon name="Eraser" size={15} className="text-muted-foreground" />Очистить переписку
                      </button>
                      <button onClick={deleteChat} disabled={deletingChat}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive text-left">
                        <Icon name="Trash2" size={15} />{deletingChat ? "Удаление..." : "Удалить чат"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center py-1.5 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-50 border border-green-100">
                <Icon name="Lock" size={10} className="text-green-500" />
                <span className="text-[11px] text-green-600 font-medium">Сквозное шифрование · WorChat</span>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto px-4 py-2 space-y-1 ${chatBgClass}`}>
              {msgsLoading && messages.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!msgsLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Icon name="MessageSquare" size={40} className="opacity-20" />
                  <p className="text-sm">Напишите первое сообщение</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-slide-up group`}
                  style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}>
                  <div className="relative">
                    <div className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl
                      ${msg.out ? "msg-out rounded-br-sm" : "msg-in rounded-bl-sm shadow-sm border border-border"}`}>
                      <MessageBubble msg={msg} allMessages={messages} />
                    </div>
                    <button onClick={() => setReplyTo(msg)}
                      className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                        w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-border
                        ${msg.out ? "-left-9" : "-right-9"}`}>
                      <Icon name="Reply" size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
              {uploadingMedia && (
                <div className="flex justify-end">
                  <div className="px-4 py-3 rounded-2xl msg-out flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Загрузка...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyTo && (
              <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-2 shrink-0">
                <div className="flex-1 border-l-2 border-primary pl-2">
                  <p className="text-xs text-primary font-medium">Ответ</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.text || "[медиа]"}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted">
                  <Icon name="X" size={14} className="text-muted-foreground" />
                </button>
              </div>
            )}

            {showAttach && (
              <div className="px-4 pb-2 bg-card border-t border-border shrink-0">
                <div className="grid grid-cols-4 gap-2 pt-3">
                  {[
                    { icon: "Image", label: "Фото", accept: "image/*", type: "image", color: "bg-purple-100 text-purple-600" },
                    { icon: "Video", label: "Видео", accept: "video/*", type: "video", color: "bg-blue-100 text-blue-600" },
                    { icon: "Music", label: "Музыка", accept: "audio/*", type: "audio", color: "bg-pink-100 text-pink-600" },
                    { icon: "FileText", label: "Файл", accept: "*/*", type: "document", color: "bg-orange-100 text-orange-600" },
                  ].map(item => (
                    <button key={item.label}
                      onClick={() => {
                        fileInputRef.current?.setAttribute("accept", item.accept);
                        fileInputRef.current?.setAttribute("data-type", item.type);
                        fileInputRef.current?.click();
                      }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.color}`}>
                        <Icon name={item.icon} size={22} />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                  <button onClick={sendGeo}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="MapPin" size={22} className="text-green-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Геолокация</span>
                  </button>
                  <button onClick={() => {
                    const name = prompt("Имя контакта:");
                    const phone = prompt("Телефон:");
                    if (name && phone) sendMessage({ msg_type: "contact", contact_name: name, contact_phone: phone, text: "" });
                    setShowAttach(false);
                  }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Icon name="UserPlus" size={22} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Контакт</span>
                  </button>
                  <button onClick={() => setShowAttach(false)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Icon name="X" size={22} className="text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Закрыть</span>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const type = fileInputRef.current?.getAttribute("data-type") || "document";
                    await handleFileUpload(file, type);
                    e.target.value = "";
                  }} />
              </div>
            )}

            <div className="px-4 py-3 bg-card border-t border-border shrink-0">
              <div className="flex items-end gap-2">
                <button onClick={() => setShowAttach(!showAttach)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0
                    ${showAttach ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                  <Icon name="Paperclip" size={18} />
                </button>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none max-h-28 transition-all"
                  style={{ lineHeight: "1.5" }} />
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
                  <Icon name="Smile" size={18} className="text-muted-foreground" />
                </button>
                <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0
                    ${input.trim() && !sending ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground"}`}>
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon name="Send" size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!activeChat && !(section === "bots" && activeBotId) && (
          <div className={`flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 ${chatBgClass}`}>
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Icon name="Lock" size={36} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">WorChat</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Все сообщения защищены сквозным шифрованием. Выберите чат или начните новый.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-50 border border-green-100">
              <Icon name="ShieldCheck" size={14} className="text-green-500" />
              <span className="text-xs text-green-600 font-medium">E2E шифрование активно</span>
            </div>
            <button onClick={() => setSection("contacts")}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all">
              Найти собеседника
            </button>
          </div>
        )}
      </div>

      {chatMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setChatMenuOpen(false)} />}

      {/* ── Create Channel Modal ── */}
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} onCreate={createChannel} />}

      {/* ── Edit Channel Modal ── */}
      {showEditChannel && activeChannel && (
        <EditChannelModal
          channel={activeChannel}
          onClose={() => setShowEditChannel(false)}
          onSave={updateChannel}
          onDelete={deleteChannel}
          onUploadAvatar={async (file) => {
            const b64 = await fileToBase64(file);
            const { ok, data } = await apiFetch(UPLOAD_URL, {
              method: "POST", body: JSON.stringify({ type: "avatar", mime: file.type, data: b64, name: file.name }),
            });
            if (ok) await updateChannel(activeChannel.id, { avatar_url: data.url });
          }}
        />
      )}

      {/* ── Payment Modal ── */}
      {showPayment && (
        <PaymentModal
          plan={paymentPlan}
          period={paymentPeriod}
          step={paymentStep}
          method={paymentMethod}
          loading={paymentLoading}
          paymentRef={paymentRef}
          cardNumber={cardNumber}
          cardExpiry={cardExpiry}
          cardCvv={cardCvv}
          cardName={cardName}
          onSetPlan={setPaymentPlan}
          onSetPeriod={setPaymentPeriod}
          onSetMethod={setPaymentMethod}
          onSetCardNumber={setCardNumber}
          onSetCardExpiry={setCardExpiry}
          onSetCardCvv={setCardCvv}
          onSetCardName={setCardName}
          onInitiate={initiatePayment}
          onConfirm={confirmPayment}
          onClose={() => { setShowPayment(false); setPaymentStep("select"); setCardNumber(""); setCardExpiry(""); setCardCvv(""); setCardName(""); }}
        />
      )}
    </div>
  );
}