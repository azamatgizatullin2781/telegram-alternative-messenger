import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const AUTH_URL = func2url.auth;
const CHATS_URL = func2url.chats;
const MESSAGES_URL = func2url.messages;
const BOT_URL = func2url.bot;
const UPLOAD_URL = func2url.upload;

// ─── Types ───────────────────────────────────────────────────────────────────
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
  media_duration?: number;
  geo_lat?: number;
  geo_lon?: number;
  contact_name?: string;
  contact_phone?: string;
  reply_to_id?: number;
}
interface BotMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  extra?: Record<string, unknown>;
  time: string;
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
  ip: string;
  lastSeen: string;
  current: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  accent: "blue",
  wallpaper: "plain",
  notifications: true,
  notifSound: true,
  notifPreview: true,
  language: "ru",
  region: "RU",
  fontSize: "md",
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
  { code: "OTHER", label: "Другой регион", flag: "🌐" },
];

// ─── API helpers ─────────────────────────────────────────────────────────────
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
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let result = digits;
  if (digits.startsWith("7") && digits.length <= 11) {
    const d = digits.slice(1);
    result = "+7" + (d.length > 0 ? " (" + d.slice(0, 3) : "");
    if (d.length > 3) result += ") " + d.slice(3, 6);
    if (d.length > 6) result += "-" + d.slice(6, 8);
    if (d.length > 8) result += "-" + d.slice(8, 10);
  } else if (digits.startsWith("8") && digits.length <= 11) {
    const d = digits.slice(1);
    result = "+7" + (d.length > 0 ? " (" + d.slice(0, 3) : "");
    if (d.length > 3) result += ") " + d.slice(3, 6);
    if (d.length > 6) result += "-" + d.slice(6, 8);
    if (d.length > 8) result += "-" + d.slice(8, 10);
  }
  return result;
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

// ─── Apply theme to DOM ───────────────────────────────────────────────────────
function applyTheme(settings: AppSettings) {
  const root = document.documentElement;
  const resolvedTheme =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : settings.theme;
  root.setAttribute("data-theme", resolvedTheme);
  root.setAttribute("data-accent", settings.accent === "blue" ? "" : settings.accent);
  root.setAttribute("data-wallpaper", settings.wallpaper);
  root.style.fontSize =
    settings.fontSize === "sm" ? "14px" : settings.fontSize === "lg" ? "18px" : "16px";
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
        {/* WELCOME */}
        {step === "welcome" && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
              <Icon name="Lock" size={44} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">WorChat</h1>
            <p className="text-muted-foreground mb-2 text-sm">Защищённый мессенджер нового поколения</p>
            <div className="flex items-center justify-center gap-4 mb-8 mt-4">
              {[
                { icon: "Shield", label: "E2E шифрование" },
                { icon: "Zap", label: "Быстрый" },
                { icon: "Globe", label: "Везде" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon name={f.icon} size={18} className="text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("language")}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Начать
            </button>
          </div>
        )}

        {/* LANGUAGE */}
        {step === "language" && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="Globe" size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Язык и регион</h2>
              <p className="text-sm text-muted-foreground mt-1">Выберите удобные настройки</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Язык интерфейса</label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {LANGUAGES.map((l) => (
                    <button key={l.code} onClick={() => setLang(l.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left
                        ${lang === l.code ? "bg-primary text-white font-medium" : "bg-muted hover:bg-muted/80"}`}>
                      <span className="text-base">{l.flag}</span>
                      <span className="truncate">{l.label}</span>
                      {lang === l.code && <Icon name="Check" size={14} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Регион</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {REGIONS.map((r) => (
                    <button key={r.code} onClick={() => setRegion(r.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left
                        ${region === r.code ? "bg-primary text-white font-medium" : "bg-muted hover:bg-muted/80"}`}>
                      <span className="text-base">{r.flag}</span>
                      <span className="truncate">{r.label}</span>
                      {region === r.code && <Icon name="Check" size={14} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep("terms")}
              className="w-full mt-4 py-3.5 rounded-2xl bg-primary text-white font-semibold text-base hover:bg-primary/90 transition-all">
              Продолжить
            </button>
          </div>
        )}

        {/* TERMS */}
        {step === "terms" && (
          <div>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="FileText" size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Пользовательское соглашение</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-4 max-h-72 overflow-y-auto text-sm text-muted-foreground space-y-3 mb-4">
              <p className="font-semibold text-foreground">Условия использования WorChat</p>
              <p>Настоящее Пользовательское соглашение регулирует использование мессенджера WorChat («Сервис»), доступного на платформах Android, iOS и Web.</p>
              <p className="font-medium text-foreground">1. Соответствие законодательству РФ</p>
              <p>Пользователь обязуется не использовать Сервис для распространения материалов, запрещённых законодательством Российской Федерации, в том числе:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Призывов к экстремизму, терроризму и насилию (ФЗ № 114-ФЗ)</li>
                <li>Распространения наркотических и психотропных веществ (УК РФ ст. 228)</li>
                <li>Детской порнографии и сексуализации несовершеннолетних (УК РФ ст. 242.1)</li>
                <li>Оскорбления религиозных чувств верующих (УК РФ ст. 148)</li>
                <li>Нарушения авторских прав (ГК РФ ч. IV)</li>
                <li>Мошенничества и финансовых пирамид (УК РФ ст. 159)</li>
                <li>Распространения персональных данных третьих лиц без согласия (ФЗ № 152-ФЗ)</li>
              </ul>
              <p className="font-medium text-foreground">2. Конфиденциальность</p>
              <p>WorChat использует сквозное шифрование. Персональные данные хранятся в соответствии с ФЗ № 152-ФЗ «О персональных данных» на серверах, расположенных на территории РФ.</p>
              <p className="font-medium text-foreground">3. Ответственность</p>
              <p>За нарушение условий настоящего соглашения Администрация вправе заблокировать аккаунт без предварительного уведомления. Пользователь несёт полную ответственность за публикуемый контент согласно действующему законодательству РФ.</p>
              <p className="font-medium text-foreground">4. Возраст</p>
              <p>Использование Сервиса разрешено лицам, достигшим 16 лет. Лица до 16 лет вправе использовать Сервис только с согласия родителей или законных представителей.</p>
              <p className="font-medium text-foreground">5. Изменения</p>
              <p>WorChat оставляет за собой право изменять условия соглашения. Продолжение использования Сервиса означает принятие новых условий.</p>
              <p className="text-xs text-muted-foreground/60 mt-2">Последнее обновление: март 2026 г.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <div onClick={() => setAgreed(!agreed)}
                className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all
                  ${agreed ? "bg-primary border-primary" : "border-border"}`}>
                {agreed && <Icon name="Check" size={12} className="text-white" />}
              </div>
              <span className="text-sm text-muted-foreground">
                Я прочитал(а) и принимаю условия Пользовательского соглашения. Мне исполнилось 16 лет.
              </span>
            </label>
            <button onClick={() => { if (agreed) onDone(lang, region); }}
              disabled={!agreed}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-40">
              Принять и продолжить
            </button>
            <button onClick={() => setStep("language")}
              className="w-full mt-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Назад
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ display_name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    let digits = raw;
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (!digits.startsWith("7") && digits.length > 0) digits = "7" + digits;
    setPhone(digits.slice(0, 11));
  };

  const displayPhone = () => {
    if (!phone) return "";
    const d = phone;
    let r = "+7";
    if (d.length > 1) r += " (" + d.slice(1, 4);
    if (d.length > 4) r += ") " + d.slice(4, 7);
    if (d.length > 7) r += "-" + d.slice(7, 9);
    if (d.length > 9) r += "-" + d.slice(9, 11);
    return r;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone.length < 11) { setError("Введите корректный номер телефона"); return; }
    setLoading(true);
    const username = phone;
    const body: Record<string, string> = { action: mode, username, password: form.password };
    if (mode === "register") body.display_name = form.display_name || displayPhone();
    const { ok, data } = await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify(body) });
    setLoading(false);
    if (!ok) { setError(data.error || "Ошибка сервера"); return; }
    localStorage.setItem("wc_token", data.token);
    onAuth(data.user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Icon name="Lock" size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">WorChat</h1>
          <p className="text-sm text-muted-foreground mt-1">Защищённый мессенджер</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${mode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Номер телефона</label>
              <div className="relative">
                <Icon name="Phone" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={displayPhone()}
                  onChange={handlePhone}
                  placeholder="+7 (___) ___-__-__"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            </div>
            {mode === "register" && (
              <div className="animate-fade-in">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Имя</label>
                <input type="text" value={form.display_name} onChange={(e) => set("display_name", e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Пароль</label>
              <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                placeholder="••••••" required autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm animate-fade-in">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 mt-2">
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="flex items-center gap-1.5 justify-center mt-5">
            <Icon name="Lock" size={11} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Сквозное шифрование · WorChat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 11, dot = true }: { user: User; size?: number; dot?: boolean }) {
  const sz = size === 9 ? "w-9 h-9 text-xs" : size === 10 ? "w-10 h-10 text-sm" : "w-11 h-11 text-sm";
  const px = size === 9 ? 36 : size === 10 ? 40 : 44;
  return (
    <div className="relative shrink-0">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.display_name}
          className={`${sz} rounded-full object-cover`}
          style={{ width: px, height: px }} />
      ) : (
        <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold`}
          style={{ background: user.avatar_color }}>
          {user.avatar_initials || user.display_name?.slice(0, 2).toUpperCase()}
        </div>
      )}
      {dot && user.status === "online" && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
      )}
    </div>
  );
}

// ─── Stellar Badge ────────────────────────────────────────────────────────────
function StellarBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "lg") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
        style={{ background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)" }}>
        ⭐ STELLAR
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold"
      style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
      ⭐
    </span>
  );
}

// ─── Reply Preview ────────────────────────────────────────────────────────────
function ReplyPreview({ msg }: { msg: Message }) {
  return (
    <div className="border-l-2 border-white/50 pl-2 mb-1.5 opacity-80">
      <p className="text-[11px] truncate max-w-[180px]">{msg.text || "[медиа]"}</p>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, allMessages }: { msg: Message; allMessages: Message[] }) {
  const replyMsg = msg.reply_to_id ? allMessages.find((m) => m.id === msg.reply_to_id) : null;
  const inner = () => {
    if (msg.msg_type === "image" && msg.media_url) {
      return (
        <div>
          {replyMsg && <ReplyPreview msg={replyMsg} />}
          <img src={msg.media_url} alt="фото" className="max-w-xs rounded-xl cursor-pointer"
            onClick={() => window.open(msg.media_url, "_blank")} />
          {msg.text && <p className="text-sm mt-1 leading-relaxed">{msg.text}</p>}
        </div>
      );
    }
    if (msg.msg_type === "video" && msg.media_url) {
      return (
        <div>
          {replyMsg && <ReplyPreview msg={replyMsg} />}
          <video src={msg.media_url} controls className="max-w-xs rounded-xl" />
          {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
        </div>
      );
    }
    if (msg.msg_type === "audio" && msg.media_url) {
      return (
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Icon name="Music" size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium truncate max-w-[150px]">{msg.media_name || "Аудио"}</p>
            <audio src={msg.media_url} controls className="w-full h-7 mt-1" />
          </div>
        </div>
      );
    }
    if (msg.msg_type === "document" && msg.media_url) {
      return (
        <a href={msg.media_url} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name="FileText" size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[180px]">{msg.media_name || "Документ"}</p>
            <p className="text-xs opacity-70">{msg.media_size ? formatBytes(msg.media_size) : "Файл"}</p>
          </div>
          <Icon name="Download" size={16} className="ml-auto shrink-0 opacity-60" />
        </a>
      );
    }
    if (msg.msg_type === "geo" && msg.geo_lat !== undefined) {
      return (
        <a href={`https://maps.google.com/?q=${msg.geo_lat},${msg.geo_lon}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <Icon name="MapPin" size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Геопозиция</p>
            <p className="text-xs opacity-70">{msg.geo_lat?.toFixed(4)}, {msg.geo_lon?.toFixed(4)}</p>
          </div>
          <Icon name="ExternalLink" size={14} className="ml-auto shrink-0 opacity-60" />
        </a>
      );
    }
    if (msg.msg_type === "contact") {
      return (
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
    }
    return (
      <div>
        {replyMsg && <ReplyPreview msg={replyMsg} />}
        <span className="text-sm leading-relaxed">{msg.text}</span>
      </div>
    );
  };
  return (
    <div>
      {inner()}
      <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.out ? "text-white/70" : "text-muted-foreground"}`}>
        <span className="text-[10px]">{msg.time}</span>
        {msg.out && (msg.status === "read"
          ? <Icon name="CheckCheck" size={12} />
          : <Icon name="Check" size={12} />)}
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({
  user,
  settings,
  onSettings,
  onLogout,
  onAvatarUpload,
  avatarUploading,
  avatarInputRef,
}: {
  user: User;
  settings: AppSettings;
  onSettings: (s: AppSettings) => void;
  onLogout: () => void;
  onAvatarUpload: (f: File) => void;
  avatarUploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [tab, setTab] = useState<"profile" | "appearance" | "notifications" | "devices" | "language">("profile");
  const [devices] = useState<DeviceInfo[]>([
    {
      name: `${detectOS()} · ${detectBrowser()}`,
      os: detectOS(),
      browser: detectBrowser(),
      ip: "—",
      lastSeen: "Сейчас",
      current: true,
    },
    {
      name: "iPhone 15 · Safari",
      os: "iOS",
      browser: "Safari",
      ip: "—",
      lastSeen: "2 дня назад",
      current: false,
    },
  ]);

  const set = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    onSettings(next);
  };

  const tabs = [
    { id: "profile", icon: "User", label: "Профиль" },
    { id: "appearance", icon: "Palette", label: "Оформление" },
    { id: "notifications", icon: "Bell", label: "Уведомления" },
    { id: "devices", icon: "Monitor", label: "Устройства" },
    { id: "language", icon: "Globe", label: "Язык" },
  ] as const;

  const accentColors: { value: Accent; color: string; label: string }[] = [
    { value: "blue", color: "#1d6cc8", label: "Синий" },
    { value: "green", color: "#22b865", label: "Зелёный" },
    { value: "purple", color: "#8b5cf6", label: "Фиолетовый" },
    { value: "red", color: "#ef4444", label: "Красный" },
    { value: "orange", color: "#f97316", label: "Оранжевый" },
    { value: "pink", color: "#ec4899", label: "Розовый" },
  ];

  const wallpapers: { value: Wallpaper; label: string; preview: string }[] = [
    { value: "plain", label: "Чистый", preview: "bg-muted" },
    { value: "dots", label: "Точки", preview: "chat-bg-dots" },
    { value: "grid", label: "Сетка", preview: "chat-bg-grid" },
    { value: "bubbles", label: "Пузыри", preview: "chat-bg-bubbles" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-border shrink-0 scrollbar-none">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all
              ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* PROFILE */}
        {tab === "profile" && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <Avatar user={user} size={11} dot={false} />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  {avatarUploading
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon name="Camera" size={12} />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{user.display_name}</div>
                <div className="text-sm text-muted-foreground">{formatPhone(user.username) || `+${user.username}`}</div>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {[
                { icon: "User", label: "Имя", value: user.display_name },
                { icon: "Phone", label: "Телефон", value: formatPhone(user.username) || user.username },
                { icon: "Shield", label: "Шифрование", value: "AES-512 E2E" },
              ].map((row) => (
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors text-destructive text-sm font-medium">
              <Icon name="LogOut" size={16} />
              Выйти из аккаунта
            </button>
          </div>
        )}

        {/* APPEARANCE */}
        {tab === "appearance" && (
          <div className="space-y-4 animate-fade-in">
            {/* Theme */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тема</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "light", icon: "Sun", label: "Светлая" },
                  { value: "dark", icon: "Moon", label: "Тёмная" },
                  { value: "system", icon: "Monitor", label: "Системная" },
                ] as { value: Theme; icon: string; label: string }[]).map((t) => (
                  <button key={t.value} onClick={() => set({ theme: t.value })}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all
                      ${settings.theme === t.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}>
                    <Icon name={t.icon} size={20} className={settings.theme === t.value ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-xs font-medium ${settings.theme === t.value ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Цвет акцента</p>
              <div className="grid grid-cols-6 gap-2">
                {accentColors.map((ac) => (
                  <button key={ac.value} onClick={() => set({ accent: ac.value })}
                    title={ac.label}
                    className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all
                      ${settings.accent === ac.value ? "border-foreground scale-105" : "border-transparent"}`}
                    style={{ background: ac.color }}>
                    {settings.accent === ac.value && <Icon name="Check" size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Фон чата</p>
              <div className="grid grid-cols-2 gap-2">
                {wallpapers.map((w) => (
                  <button key={w.value} onClick={() => set({ wallpaper: w.value })}
                    className={`relative h-16 rounded-2xl border-2 overflow-hidden transition-all ${settings.wallpaper === w.value ? "border-primary" : "border-border"}`}>
                    <div className={`absolute inset-0 ${w.preview}`} />
                    <div className="absolute inset-0 flex items-end justify-start p-2">
                      <span className="text-xs font-medium bg-white/80 rounded-lg px-2 py-0.5">{w.label}</span>
                    </div>
                    {settings.wallpaper === w.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Icon name="Check" size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Размер текста</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "sm", label: "Мелкий", size: "text-xs" },
                  { value: "md", label: "Средний", size: "text-sm" },
                  { value: "lg", label: "Крупный", size: "text-base" },
                ] as { value: "sm" | "md" | "lg"; label: string; size: string }[]).map((f) => (
                  <button key={f.value} onClick={() => set({ fontSize: f.value })}
                    className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1
                      ${settings.fontSize === f.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}>
                    <span className={`${f.size} font-semibold ${settings.fontSize === f.value ? "text-primary" : "text-foreground"}`}>Аа</span>
                    <span className="text-[10px] text-muted-foreground">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {[
                {
                  icon: "Bell",
                  label: "Уведомления",
                  desc: "Показывать уведомления о новых сообщениях",
                  key: "notifications" as keyof AppSettings,
                },
                {
                  icon: "Volume2",
                  label: "Звук",
                  desc: "Звуковой сигнал при получении сообщения",
                  key: "notifSound" as keyof AppSettings,
                },
                {
                  icon: "Eye",
                  label: "Предпросмотр",
                  desc: "Показывать текст сообщения в уведомлении",
                  key: "notifPreview" as keyof AppSettings,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={17} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => set({ [item.key]: !settings[item.key] } as Partial<AppSettings>)}
                    className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${settings[item.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[item.key] ? "left-5.5 translate-x-0" : "left-0.5"}`}
                      style={{ left: settings[item.key] ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              Для получения push-уведомлений разрешите их в настройках браузера / устройства
            </p>
          </div>
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-muted-foreground">Устройства, с которых выполнен вход в ваш аккаунт</p>
            {devices.map((dev, i) => (
              <div key={i} className={`bg-card rounded-2xl border p-4 ${dev.current ? "border-primary/40" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${dev.current ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon name={dev.os === "Android" || dev.os === "iOS" ? "Smartphone" : "Monitor"} size={20}
                      className={dev.current ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{dev.name}</span>
                      {dev.current && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Текущее</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Icon name="Clock" size={11} />
                        {dev.lastSeen}
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="Globe" size={11} />
                        IP: {dev.ip}
                      </div>
                    </div>
                  </div>
                  {!dev.current && (
                    <button className="text-xs text-destructive hover:text-destructive/80 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-destructive/10">
                      Завершить
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button className="w-full py-3 rounded-2xl border-2 border-dashed border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
              Завершить все другие сеансы
            </button>
          </div>
        )}

        {/* LANGUAGE */}
        {tab === "language" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Язык интерфейса</p>
              <div className="space-y-1.5">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => set({ language: l.code })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left
                      ${settings.language === l.code ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
                    <span className="text-xl">{l.flag}</span>
                    <span className={`flex-1 text-sm font-medium ${settings.language === l.code ? "text-primary" : "text-foreground"}`}>{l.label}</span>
                    {settings.language === l.code && <Icon name="Check" size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Регион</p>
              <div className="space-y-1.5">
                {REGIONS.map((r) => (
                  <button key={r.code} onClick={() => set({ region: r.code })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left
                      ${settings.region === r.code ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
                    <span className="text-xl">{r.flag}</span>
                    <span className={`flex-1 text-sm font-medium ${settings.region === r.code ? "text-primary" : "text-foreground"}`}>{r.label}</span>
                    {settings.region === r.code && <Icon name="Check" size={16} className="text-primary" />}
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

// ─── Main App ─────────────────────────────────────────────────────────────────
type Section = "chats" | "channels" | "bots" | "calls" | "contacts" | "archive" | "search" | "settings" | "profile";

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
  const [subLoading, setSubLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const s = localStorage.getItem("wc_settings");
      return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botEndRef = useRef<HTMLDivElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply settings to DOM
  useEffect(() => { applyTheme(settings); }, [settings]);

  // Save settings
  const updateSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    localStorage.setItem("wc_settings", JSON.stringify(s));
    applyTheme(s);
  }, []);

  // Auth check
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecked(true); return; }
    apiFetch(AUTH_URL).then(({ ok, data }) => {
      if (ok) setUser(data.user);
      else localStorage.removeItem("wc_token");
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
    if (user && (section === "contacts" || section === "search" || section === "calls")) loadContacts();
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
      loadBotHistory();
      loadSubscription();
    }
  }, [user, activeBotId, loadBotHistory, loadSubscription]);

  const logout = async () => {
    await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "logout" }) });
    localStorage.removeItem("wc_token");
    setUser(null);
    setChats([]); setContacts([]); setActiveChat(null); setMessages([]);
  };

  const openChat = (chat: ChatItem) => {
    setActiveChat(chat);
    setReplyTo(null);
    setShowAttach(false);
    setChatMenuOpen(false);
    setMobileView("chat");
  };

  const startChatWithContact = async (contact: User) => {
    const { ok, data } = await apiFetch(CHATS_URL, {
      method: "POST",
      body: JSON.stringify({ action: "start", partner_id: contact.id }),
    });
    if (!ok) return;
    const res = await apiFetch(`${CHATS_URL}?action=chats`);
    if (res.ok) {
      const updatedChats: ChatItem[] = res.data.chats || [];
      setChats(updatedChats);
      const found = updatedChats.find((c) => c.chat_id === data.chat_id);
      if (found) { setSection("chats"); openChat(found); }
    }
  };

  const sendMessage = async (overrides?: Partial<Message>) => {
    if (!activeChat || sending) return;
    const text = input.trim();
    if (!overrides && !text) return;
    setInput("");
    setReplyTo(null);
    setShowAttach(false);
    setSending(true);
    const payload: Record<string, unknown> = {
      action: "send",
      chat_id: activeChat.chat_id,
      msg_type: "text",
      text,
      ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      ...overrides,
    };
    const { ok, data } = await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify(payload) });
    if (ok) {
      setMessages((prev) => [...prev, data.message]);
      loadChats();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileUpload = async (file: File, forceType?: string) => {
    if (!activeChat) return;
    setUploadingMedia(true);
    setShowAttach(false);
    const mime = file.type;
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type: "media", mime, data: b64, name: file.name }),
    });
    if (!ok) { setUploadingMedia(false); return; }
    const msgType = forceType || data.category || "document";
    await sendMessage({ msg_type: msgType, media_url: data.url, media_name: file.name, media_size: file.size, text: "" });
    setUploadingMedia(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type: "avatar", mime: file.type, data: b64, name: file.name }),
    });
    if (ok && user) setUser({ ...user, avatar_url: data.url });
    setAvatarUploading(false);
  };

  const sendGeo = () => {
    if (!activeChat) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => sendMessage({ msg_type: "geo", geo_lat: pos.coords.latitude, geo_lon: pos.coords.longitude, text: "" }),
      () => alert("Нет доступа к геолокации"),
    );
  };

  const deleteChat = async () => {
    if (!activeChat) return;
    setDeletingChat(true);
    setChatMenuOpen(false);
    await apiFetch(MESSAGES_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete_chat", chat_id: activeChat.chat_id }),
    });
    setMessages([]);
    setChats((prev) => prev.filter((c) => c.chat_id !== activeChat.chat_id));
    setActiveChat(null);
    setMobileView("list");
    setDeletingChat(false);
  };

  const clearChat = async () => {
    if (!activeChat) return;
    setChatMenuOpen(false);
    await apiFetch(MESSAGES_URL, {
      method: "POST",
      body: JSON.stringify({ action: "clear_chat", chat_id: activeChat.chat_id }),
    });
    setMessages([]);
    loadChats();
  };

  const sendBotMessage = async () => {
    const text = botInput.trim();
    if (!text || botSending) return;
    setBotInput("");
    setBotSending(true);
    setBotMessages((prev) => [...prev, { id: Date.now(), role: "user", text, time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) }]);
    const { ok, data } = await apiFetch(BOT_URL, { method: "POST", body: JSON.stringify({ action: "send", text }) });
    if (ok) {
      const reply = data.reply;
      setBotMessages((prev) => [...prev, { id: Date.now() + 1, role: "bot", text: reply.text, extra: reply, time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) }]);
      if (reply.type === "subscription_offer") loadSubscription();
    }
    setBotSending(false);
  };

  const paySubscription = async () => {
    setSubLoading(true);
    const { ok } = await apiFetch(BOT_URL, { method: "POST", body: JSON.stringify({ action: "pay_subscription", plan: "stellar" }) });
    if (ok) { await loadSubscription(); await loadBotHistory(); }
    setSubLoading(false);
  };

  const filteredChats = chats.filter((c) => c.partner.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // chat bg class
  const chatBgClass =
    settings.wallpaper === "dots" ? "chat-bg-dots" :
    settings.wallpaper === "grid" ? "chat-bg-grid" :
    settings.wallpaper === "bubbles" ? "chat-bg-bubbles" :
    "chat-bg";

  // ── Onboarding gate
  if (!onboardingDone) {
    return (
      <OnboardingScreen onDone={(lang, region) => {
        localStorage.setItem("wc_onboarded", "1");
        updateSettings({ ...settings, language: lang, region });
        setOnboardingDone(true);
      }} />
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={setUser} />;

  const navItems: { id: Section; icon: string; label: string }[] = [
    { id: "chats", icon: "MessageSquare", label: "Чаты" },
    { id: "channels", icon: "Rss", label: "Каналы" },
    { id: "bots", icon: "Bot", label: "Боты" },
    { id: "calls", icon: "Phone", label: "Звонки" },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "search", icon: "Search", label: "Поиск" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar nav */}
      <div className="w-16 flex-col items-center py-3 gap-1 border-r border-border bg-card shrink-0 hidden md:flex">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-md shadow-primary/20">
          <Icon name="Lock" size={18} className="text-white" />
        </div>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => { setSection(item.id); if (item.id !== "chats") { setActiveChat(null); setMobileView("list"); } }}
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
        <div className="mt-auto">
          <button onClick={() => setSection("profile")}
            className={`w-11 h-11 rounded-2xl overflow-hidden transition-all ${section === "profile" ? "ring-2 ring-primary" : ""}`}>
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: user.avatar_color }}>
              {user.avatar_initials || user.display_name.slice(0, 2).toUpperCase()}
            </div>
          </button>
        </div>
      </div>

      {/* Left panel */}
      <div className={`w-full md:w-80 flex flex-col border-r border-border bg-card shrink-0
        ${mobileView === "chat" && activeChat ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {navItems.find((n) => n.id === section)?.label || "WorChat"}
          </h2>
          {section === "chats" && (
            <button onClick={() => setSection("contacts")}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
              <Icon name="PenSquare" size={17} className="text-muted-foreground" />
            </button>
          )}
          {section === "search" && (
            <div className="flex-1 ml-3">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..." autoFocus
                className="w-full px-3 py-1.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden overflow-x-auto gap-1 px-3 py-2 border-b border-border scrollbar-none shrink-0">
          {navItems.map((item) => (
            <button key={item.id}
              onClick={() => { setSection(item.id); if (item.id !== "chats") { setActiveChat(null); setMobileView("list"); } }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0
                ${section === item.id ? "bg-primary text-white" : "text-muted-foreground bg-muted/50"}`}>
              <Icon name={item.icon} size={13} />
              {item.label}
              {item.id === "chats" && totalUnread > 0 && (
                <span className="min-w-4 h-4 px-1 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar in chats */}
        {section === "chats" && (
          <div className="px-4 py-2 shrink-0">
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск чатов..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* SETTINGS */}
          {section === "settings" && (
            <SettingsScreen
              user={user}
              settings={settings}
              onSettings={updateSettings}
              onLogout={logout}
              onAvatarUpload={handleAvatarUpload}
              avatarUploading={avatarUploading}
              avatarInputRef={avatarInputRef as React.RefObject<HTMLInputElement>}
            />
          )}

          {/* PROFILE */}
          {section === "profile" && (
            <div className="px-4 py-4 space-y-3 animate-fade-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <Avatar user={user} size={11} dot={false} />
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                    {avatarUploading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name="Camera" size={12} />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground">{formatPhone(user.username) || user.username}</div>
                  {subscription && <StellarBadge size="lg" />}
                </div>
              </div>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors text-destructive text-sm font-medium mt-3">
                <Icon name="LogOut" size={16} />
                Выйти из аккаунта
              </button>
            </div>
          )}

          {/* CHATS */}
          {section === "chats" && (
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
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-all">
                    Найти собеседника
                  </button>
                </div>
              )}
              {filteredChats.map((c, i) => (
                <button key={c.chat_id} onClick={() => openChat(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left animate-fade-in
                    ${activeChat?.chat_id === c.chat_id ? "bg-primary/[0.07] border-r-2 border-primary" : ""}`}
                  style={{ animationDelay: `${i * 25}ms` }}>
                  <Avatar user={c.partner} />
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

          {/* CONTACTS */}
          {section === "contacts" && (
            <div className="px-4 py-2">
              {contacts.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {(["online", "offline"] as const).map((st) => {
                const list = filteredContacts.filter((c) => c.status === st);
                if (list.length === 0) return null;
                return (
                  <div key={st}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1.5">
                      {st === "online" ? `Онлайн · ${list.length}` : `Не в сети · ${list.length}`}
                    </div>
                    {list.map((c) => (
                      <button key={c.id} onClick={() => startChatWithContact(c)}
                        className={`w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left ${st === "offline" ? "opacity-55" : ""}`}>
                        <Avatar user={c} size={10} />
                        <div>
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

          {/* SEARCH */}
          {section === "search" && (
            <div className="px-4 py-2">
              <div className="relative mb-3">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Имя или логин..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {searchQuery ? (
                filteredContacts.length > 0 ? (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1 mb-2">Пользователи</div>
                    {filteredContacts.map((c) => (
                      <button key={c.id} onClick={() => startChatWithContact(c)}
                        className="w-full flex items-center gap-3 py-2.5 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left">
                        <Avatar user={c} size={10} />
                        <div>
                          <div className="text-sm font-medium">{c.display_name}</div>
                          <div className="text-xs text-muted-foreground">+{c.username}</div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Ничего не найдено</p>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <Icon name="Search" size={32} className="opacity-25" />
                  <p className="text-sm">Введите имя или телефон</p>
                </div>
              )}
            </div>
          )}

          {/* ARCHIVE */}
          {section === "archive" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Icon name="Archive" size={36} className="opacity-25" />
              <p className="text-sm">Архив пуст</p>
            </div>
          )}

          {/* CHANNELS */}
          {section === "channels" && (
            <div className="px-4 py-2">
              {[
                { name: "WorChat Новости", sub: "Официальный канал", members: "12.4K", icon: "Rss", color: "#6366f1" },
                { name: "Технологии", sub: "Последние новости IT", members: "8.1K", icon: "Cpu", color: "#0ea5e9" },
                { name: "Дизайн", sub: "UI/UX вдохновение", members: "5.3K", icon: "Palette", color: "#f59e0b" },
                { name: "Крипто", sub: "Курсы и аналитика", members: "21K", icon: "TrendingUp", color: "#10b981" },
              ].map((ch) => (
                <button key={ch.name}
                  className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: ch.color }}>
                    <Icon name={ch.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ch.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{ch.sub}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{ch.members}</div>
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-border">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:bg-muted/60 transition-colors text-muted-foreground text-sm">
                  <Icon name="Plus" size={16} />
                  Создать канал
                </button>
              </div>
            </div>
          )}

          {/* BOTS */}
          {section === "bots" && !activeBotId && (
            <div className="px-4 py-2">
              <button onClick={() => setActiveBotId("worchat_bot")}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left mb-1">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 relative"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                  <Icon name="Bot" size={22} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">WorChat Bot</span>
                    <StellarBadge />
                  </div>
                  <div className="text-xs text-muted-foreground">Приветствие · Stellar · Помощь</div>
                </div>
                <Icon name="ChevronRight" size={15} className="text-muted-foreground shrink-0" />
              </button>
            </div>
          )}

          {/* CALLS */}
          {section === "calls" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Icon name="PhoneOff" size={36} className="opacity-25" />
              <p className="text-sm">Нет истории звонков</p>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className={`flex-1 flex flex-col ${mobileView === "list" && !activeChat ? "hidden md:flex" : "flex"}`}>

        {/* BOT SCREEN */}
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
              <div>
                <div className="text-sm font-semibold">WorChat Bot</div>
                <div className="text-xs text-green-500">Онлайн</div>
              </div>
            </div>
            <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${chatBgClass}`}>
              {botMessages.map((bm) => {
                if (bm.role === "bot" && bm.extra && (bm.extra as Record<string, unknown>).type === "subscription_offer") {
                  return (
                    <div key={bm.id} className="flex justify-start">
                      <div className="max-w-xs bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <StellarBadge size="lg" />
                        </div>
                        <p className="text-sm text-foreground mb-3">{bm.text}</p>
                        {!subscription ? (
                          <button onClick={paySubscription} disabled={subLoading}
                            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                            {subLoading ? "Оформляем..." : "Оформить за 299₽/мес"}
                          </button>
                        ) : (
                          <div className="text-center text-sm text-green-600 font-medium">✓ Stellar активна</div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={bm.id} className={`flex ${bm.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-3.5 py-2.5 rounded-2xl text-sm ${bm.role === "user" ? "msg-out rounded-br-sm" : "msg-in rounded-bl-sm shadow-sm border border-border"}`}>
                      {bm.text}
                      <div className={`text-[10px] mt-0.5 text-right ${bm.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>{bm.time}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={botEndRef} />
            </div>
            <div className="px-4 py-3 bg-card border-t border-border shrink-0">
              <div className="flex items-center gap-2">
                <input value={botInput} onChange={(e) => setBotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendBotMessage(); }}
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

        {/* CHAT SCREEN */}
        {activeChat && (
          <>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-card shrink-0">
              <button onClick={() => { setMobileView("list"); }}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
              </button>
              <Avatar user={activeChat.partner} size={9} />
              <div>
                <div className="text-sm font-semibold">{activeChat.partner.display_name}</div>
                <div className={`text-xs ${activeChat.partner.status === "online" ? "text-green-500" : "text-muted-foreground"}`}>
                  {activeChat.partner.status === "online" ? "В сети" : "Не в сети"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                  <Icon name="Phone" size={17} className="text-muted-foreground" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
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
                        <Icon name="Eraser" size={15} className="text-muted-foreground" />
                        Очистить переписку
                      </button>
                      <button onClick={deleteChat} disabled={deletingChat}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-destructive text-left">
                        <Icon name="Trash2" size={15} />
                        {deletingChat ? "Удаление..." : "Удалить чат"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center py-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-100">
                <Icon name="Lock" size={11} className="text-green-500" />
                <span className="text-xs text-green-600 font-medium font-mono">Сквозное шифрование · WorChat</span>
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
                <div key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-slide-up group`}
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
                    { icon: "Image", label: "Фото", accept: "image/*", type: "image" },
                    { icon: "Video", label: "Видео", accept: "video/*", type: "video" },
                    { icon: "Music", label: "Музыка", accept: "audio/*", type: "audio" },
                    { icon: "FileText", label: "Файл", accept: "*/*", type: "document" },
                  ].map((item) => (
                    <button key={item.label}
                      onClick={() => { fileInputRef.current?.setAttribute("accept", item.accept); fileInputRef.current?.setAttribute("data-type", item.type); fileInputRef.current?.click(); }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon name={item.icon} size={20} className="text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                  <button onClick={sendGeo}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="MapPin" size={20} className="text-green-600" />
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
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Icon name="UserPlus" size={20} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Контакт</span>
                  </button>
                  <button onClick={() => setShowAttach(false)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon name="X" size={20} className="text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Закрыть</span>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    const t = fileInputRef.current?.getAttribute("data-type") || undefined;
                    if (f) handleFileUpload(f, t);
                    e.target.value = "";
                  }} />
              </div>
            )}

            <div className="px-4 py-3 bg-card border-t border-border shrink-0">
              <div className="flex items-end gap-2">
                <button onClick={() => setShowAttach(!showAttach)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0
                    ${showAttach ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                  <Icon name="Paperclip" size={18} />
                </button>
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Сообщение..." rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground transition-all max-h-32 overflow-auto"
                  style={{ lineHeight: "1.5" }} />
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0">
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
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon name="Lock" size={36} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">WorChat</h3>
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

      {/* Click outside to close chat menu */}
      {chatMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setChatMenuOpen(false)} />
      )}
    </div>
  );
}
