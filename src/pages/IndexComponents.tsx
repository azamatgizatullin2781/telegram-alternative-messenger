import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import Icon from "@/components/ui/icon";
import { User, Message, CallSession, AppSettings, Accent, Theme, Wallpaper, Channel, LANGUAGES, REGIONS, useT } from "./IndexTypes";
import { apiFetch, formatBytes, formatPhone, detectBrowser, detectOS, AUTH_URL, CALLS_URL, UPLOAD_URL } from "@/lib/api";

// ─── Toast System ─────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info" | "warning";
interface Toast { id: number; type: ToastType; text: string; }
interface ToastCtx { show: (text: string, type?: ToastType) => void; }
export const ToastContext = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const icons: Record<ToastType, string> = { success: "CheckCircle", error: "XCircle", info: "Info", warning: "AlertTriangle" };
  const colors: Record<ToastType, string> = {
    success: "bg-green-500", error: "bg-destructive", info: "bg-primary", warning: "bg-orange-500",
  };
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-20 md:bottom-5 right-4 z-[500] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-sm shadow-xl max-w-xs animate-fade-in ${colors[t.type]}`}>
            <Icon name={icons[t.type]} size={16} className="shrink-0" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Browser Notifications ────────────────────────────────────────────────────
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string, icon?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, { body, icon: icon || "/favicon.ico", badge: "/favicon.ico" });
  n.onclick = () => { window.focus(); n.close(); };
  setTimeout(() => n.close(), 5000);
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
export function OnboardingScreen({ onDone }: { onDone: (lang: string, region: string) => void }) {
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
              <p>Настоящее Соглашение регулирует использование мессенджера WorChat в соответствии с законодательством РФ.</p>
              <p>Все сообщения защищены сквозным шифрованием AES-512. Мы не имеем доступа к содержанию ваших переписок.</p>
              <p>Персональные данные обрабатываются строго в целях функционирования сервиса и не передаются третьим лицам.</p>
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
export function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
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
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Имя</label>
                <input value={form.display_name} onChange={e => set("display_name", e.target.value)}
                  placeholder="Ваше имя" required
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Телефон</label>
              <input value={displayPhone()} onChange={handlePhone}
                placeholder="+7 (999) 123-45-67" required inputMode="tel"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Пароль</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === "login" ? "Войти" : "Зарегистрироваться"}
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
export function Avatar({ user, size = 44, dot = true }: { user: User; size?: number; dot?: boolean }) {
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
export function Badge({ plan, size = "sm" }: { plan: "standard" | "premium"; size?: "sm" | "lg" }) {
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
export function ReplyPreview({ msg }: { msg: Message }) {
  return (
    <div className="border-l-2 border-white/60 pl-2 mb-1.5 opacity-90">
      <p className="text-[11px] truncate max-w-[200px]">{msg.text || "[медиа]"}</p>
    </div>
  );
}

// ─── Voice Player (встроенный) ────────────────────────────────────────────────
function VoicePlayer({ url, duration: totalDur, isOut }: { url: string; duration?: number; isOut: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const dur = totalDur || 0;
  const progress = dur > 0 ? (currentTime / dur) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[220px]">
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={() => setLoaded(true)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }} />
      <button onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all
          ${isOut ? "bg-white/25 hover:bg-white/35" : "bg-primary/15 hover:bg-primary/25"}`}>
        <Icon name={playing ? "Pause" : "Play"} size={16} className={isOut ? "text-white" : "text-primary"} />
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${isOut ? "bg-white/20" : "bg-muted"}`}
          onClick={e => {
            if (!audioRef.current || !loaded) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = ratio * (dur || audioRef.current.duration || 0);
          }}>
          <div className={`h-full rounded-full transition-all ${isOut ? "bg-white/70" : "bg-primary"}`}
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className={`text-[10px] ${isOut ? "text-white/60" : "text-muted-foreground"}`}>
            {playing ? fmt(currentTime) : fmt(dur)}
          </span>
          {!isOut && <Icon name="Mic" size={10} className="text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
export function MessageBubble({ msg, allMessages, onPhotoClick }: {
  msg: Message;
  allMessages: Message[];
  onPhotoClick?: (url: string) => void;
}) {
  const reply = msg.reply_to_id ? allMessages.find(m => m.id === msg.reply_to_id) : null;
  const dur = (msg as { media_duration?: number }).media_duration;
  const renderContent = () => {
    if (msg.msg_type === "image" && msg.media_url) return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <img src={msg.media_url} alt="фото" className="max-w-[220px] sm:max-w-xs rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
          onClick={e => { e.stopPropagation(); onPhotoClick?.(msg.media_url!); }} />
        {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
      </div>
    );
    if (msg.msg_type === "video" && msg.media_url) return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <video src={msg.media_url} controls className="max-w-[220px] sm:max-w-xs rounded-xl" />
        {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
      </div>
    );
    if (msg.msg_type === "video_note" && msg.media_url) return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-lg relative group">
          <video src={msg.media_url} loop playsInline
            className="w-full h-full object-cover"
            onClick={e => { const v = e.currentTarget; if (v.paused) { v.play(); } else { v.pause(); } }} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
            <Icon name="CirclePlay" size={28} className="text-white opacity-80" />
          </div>
        </div>
        <span className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>Видеосообщение{dur ? ` · ${String(Math.floor(dur/60)).padStart(2,"0")}:${String(dur%60).padStart(2,"0")}` : ""}</span>
      </div>
    );
    if (msg.msg_type === "voice" && msg.media_url) return (
      <VoicePlayer url={msg.media_url} duration={dur} isOut={!!msg.out} />
    );
    if (msg.msg_type === "audio" && msg.media_url) return (
      <div className="flex items-center gap-2.5 min-w-[180px]">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${msg.out ? "bg-white/20" : "bg-primary/10"}`}>
          <Icon name="Music" size={18} className={msg.out ? "text-white" : "text-primary"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{msg.media_name || "Аудио"}</p>
          <audio src={msg.media_url} controls className="h-7 w-full max-w-[150px] mt-0.5" />
          {msg.media_size && <p className={`text-[10px] mt-0.5 ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{formatBytes(msg.media_size)}</p>}
        </div>
      </div>
    );
    if (msg.msg_type === "document" && msg.media_url) return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors min-w-[160px]
          ${msg.out ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${msg.out ? "bg-white/20" : "bg-primary/10"}`}>
          <Icon name="FileText" size={17} className={msg.out ? "text-white" : "text-primary"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{msg.media_name || "Файл"}</p>
          {msg.media_size && <p className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{formatBytes(msg.media_size)}</p>}
        </div>
        <Icon name="Download" size={14} className={`shrink-0 ${msg.out ? "text-white/60" : "text-muted-foreground"}`} />
      </a>
    );
    if (msg.msg_type === "geo" && msg.geo_lat) return (
      <a href={`https://maps.google.com/?q=${msg.geo_lat},${msg.geo_lon}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        className={`flex flex-col rounded-xl overflow-hidden min-w-[200px] ${msg.out ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"} transition-colors`}>
        <div className="relative h-24 bg-green-100 dark:bg-green-900/30 overflow-hidden">
          <img
            src={`https://static-maps.yandex.ru/1.x/?ll=${msg.geo_lon},${msg.geo_lat}&size=200,100&z=14&l=map&pt=${msg.geo_lon},${msg.geo_lat},pm2rdm`}
            alt="карта" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <Icon name="MapPin" size={16} className="text-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2">
          <Icon name="MapPin" size={13} className={msg.out ? "text-white/70" : "text-muted-foreground"} />
          <div>
            <p className="text-sm font-medium">Геопозиция</p>
            <p className={`text-[10px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.geo_lat?.toFixed(5)}, {msg.geo_lon?.toFixed(5)}</p>
          </div>
        </div>
      </a>
    );
    if (msg.msg_type === "contact") return (
      <div className={`flex items-center gap-2.5 p-2 rounded-xl ${msg.out ? "bg-white/10" : "bg-muted"}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${msg.out ? "bg-white/20" : "bg-blue-100"}`}>
          <Icon name="User" size={20} className={msg.out ? "text-white" : "text-blue-600"} />
        </div>
        <div>
          <p className="text-sm font-medium">{msg.contact_name}</p>
          <p className={`text-xs ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>{msg.contact_phone}</p>
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

// ─── Voice Recorder ───────────────────────────────────────────────────────────
export function VoiceRecorder({ onSend, onCancel }: {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(20).fill(2));
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);
  const durationRef = useRef(0);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      mediaRef.current?.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Analyser for waveform visualization
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      const drawLevels = () => {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const bars = Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor(i * buf.length / 20);
          return Math.max(2, Math.round((buf[idx] / 255) * 32));
        });
        setLevels(bars);
        animRef.current = requestAnimationFrame(drawLevels);
      };
      drawLevels();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        cancelAnimationFrame(animRef.current);
        ctx.close();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setRecorded(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      setRecording(true);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("Нет доступа к микрофону. Разрешите в браузере.");
      } else {
        setError("Не удалось запустить запись.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl px-3 py-2.5">
        <Icon name="MicOff" size={18} className="text-destructive shrink-0" />
        <span className="text-sm text-destructive flex-1">{error}</span>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">Закрыть</button>
      </div>
    );
  }

  if (!recording && audioUrl && recorded) {
    return (
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm">
        <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10">
          <Icon name="Trash2" size={16} />
        </button>
        <audio src={audioUrl} controls className="flex-1 h-8" />
        <span className="text-xs text-muted-foreground shrink-0">{fmt(duration)}</span>
        <button onClick={() => onSend(recorded, duration)}
          className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white hover:bg-primary/90 transition-all shrink-0">
          <Icon name="Send" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-2xl px-3 py-2">
      <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10">
        <Icon name="X" size={16} />
      </button>
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0" />
        <span className="text-sm text-destructive font-medium shrink-0">{fmt(duration)}</span>
        <div className="flex-1 flex gap-px items-center overflow-hidden">
          {levels.map((h, i) => (
            <div key={i} className="flex-1 bg-destructive/60 rounded-full transition-all duration-75"
              style={{ height: `${h}px`, minWidth: "2px" }} />
          ))}
        </div>
      </div>
      <button onClick={stopRecording}
        className="w-9 h-9 bg-destructive rounded-xl flex items-center justify-center text-white hover:bg-destructive/90 shrink-0">
        <Icon name="Square" size={16} />
      </button>
    </div>
  );
}

// ─── Video Note Recorder ──────────────────────────────────────────────────────
export function VideoNoteRecorder({ onSend, onCancel }: {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 300, height: 300 }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      let cnt = 3;
      setCountdown(3);
      const cdTimer = setInterval(() => {
        cnt -= 1;
        setCountdown(cnt);
        if (cnt === 0) {
          clearInterval(cdTimer);
          startRec(stream);
        }
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setCamError("Нет доступа к камере. Разрешите в настройках браузера.");
      } else {
        setCamError("Камера недоступна или занята другим приложением.");
      }
    }
  };

  const startRec = (stream: MediaStream) => {
    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    mediaRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecorded(blob);
      setPreview(URL.createObjectURL(blob));
    };
    mr.start(100);
    setRecording(true);
    durationRef.current = 0;
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
      if (durationRef.current >= 60) stopRec();
    }, 1000);
  };

  const stopRec = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setRecording(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = Math.min(duration / 60, 1);
  const r = 52, circ = 2 * Math.PI * r;

  if (camError) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Icon name="VideoOff" size={26} className="text-destructive" />
          </div>
          <div>
            <p className="font-bold text-base mb-1">Нет доступа к камере</p>
            <p className="text-sm text-muted-foreground">{camError}</p>
          </div>
          <button onClick={onCancel} className="w-full py-2.5 rounded-xl bg-muted text-sm hover:bg-muted/80">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Видеосообщение</h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex justify-center relative">
          <svg className="absolute" width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            {recording && (
              <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--destructive))" strokeWidth="4"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} strokeLinecap="round"
                className="transition-all duration-1000" />
            )}
          </svg>
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 relative">
            {!preview ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            ) : (
              <video src={preview} autoPlay loop playsInline muted className="w-full h-full object-cover" />
            )}
            {countdown > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{countdown}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          {recording && <p className="text-sm text-destructive font-medium">● {fmt(duration)} / 1:00</p>}
          {preview && <p className="text-sm text-muted-foreground">Готово · {fmt(duration)}</p>}
          {!recording && !preview && countdown > 0 && <p className="text-sm text-muted-foreground">Подготовка...</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted">Отмена</button>
          {recording && (
            <button onClick={stopRec} className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium">Стоп</button>
          )}
          {preview && recorded && (
            <button onClick={() => onSend(recorded, duration)} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">Отправить</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Profile Modal ───────────────────────────────────────────────────────
export function UserProfileModal({ user, onClose, onStartChat, onCall }: {
  user: User;
  onClose: () => void;
  onStartChat?: () => void;
  onCall?: (type: "audio" | "video") => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="relative h-28 bg-gradient-to-br from-primary/30 to-primary/10">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="px-6 pb-6 -mt-10">
          <div className="mb-3">
            <Avatar user={user} size={72} dot={true} />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{user.display_name}</h2>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${user.status === "online" ? "bg-green-400" : "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{user.status === "online" ? "В сети" : "Не в сети"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-muted/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Shield" size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Шифрование</span>
              <span className="ml-auto font-medium text-xs">AES-512 E2E</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {onStartChat && (
              <button onClick={() => { onStartChat(); onClose(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors">
                <Icon name="MessageCircle" size={20} className="text-primary" />
                <span className="text-xs font-medium text-primary">Написать</span>
              </button>
            )}
            {onCall && (
              <>
                <button onClick={() => { onCall("audio"); onClose(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-green-500/10 hover:bg-green-500/15 transition-colors">
                  <Icon name="Phone" size={20} className="text-green-600" />
                  <span className="text-xs font-medium text-green-600">Позвонить</span>
                </button>
                <button onClick={() => { onCall("video"); onClose(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 transition-colors">
                  <Icon name="Video" size={20} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Видео</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Photo Viewer ─────────────────────────────────────────────────────────────
export function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <Icon name="X" size={20} />
      </button>
      <a href={url} download className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <Icon name="Download" size={20} />
      </a>
      <img src={url} alt="" className="max-w-full max-h-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ─── Incoming Call Modal ──────────────────────────────────────────────────────
export function IncomingCallModal({ call, onAnswer, onReject }: {
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
export function CallScreen({ partner, callType, roomId, isCallee, onEnd }: {
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
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  const sendSignal = useCallback(async (type: string, data: unknown) => {
    await apiFetch(CALLS_URL, {
      method: "POST",
      body: JSON.stringify({ action: "signal", room_id: roomId, signal_type: type, signal_data: data }),
    });
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    if (startedRef.current) return;
    startedRef.current = true;

    const start = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: callType === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Media error:", err);
        if (mounted) setStatus("Нет доступа к микрофону");
      }

      pc.ontrack = e => {
        const stream = e.streams[0];
        if (callType === "video" && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
        if (mounted) setStatus("В сети");
      };

      pc.onicecandidate = e => {
        if (e.candidate) sendSignal("ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") {
          if (mounted) setStatus("В сети");
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          if (mounted) setStatus("Соединение прервано");
        }
      };

      if (!isCallee) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === "video" });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer.sdp, type: offer.type });
      }

      pollRef.current = setInterval(async () => {
        if (!mounted) return;
        const { ok, data } = await apiFetch(`${CALLS_URL}?action=signals&room=${roomId}&since_id=${lastSigId.current}`);
        if (!ok) return;
        const { signals, status: cs } = data;
        if (cs === "ended" || cs === "rejected") { onEnd(); return; }
        if (cs === "active" && status === "Вызов...") if (mounted) setStatus("Подключение...");
        for (const sig of (signals || [])) {
          lastSigId.current = Math.max(lastSigId.current, sig.id);
          if (sig.type === "offer" && isCallee) {
            if (pc.signalingState !== "stable") continue;
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
    const next = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMicMuted(next);
  };
  const toggleCam = () => {
    const next = !camOff;
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next; });
    setCamOff(next);
  };

  const handleEnd = async () => {
    await apiFetch(CALLS_URL, { method: "POST", body: JSON.stringify({ action: "end", room_id: roomId }) });
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-gradient-to-b from-gray-900 to-black">
      {callType === "video" && (
        <video ref={remoteVideoRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90" />
      )}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex flex-col items-center pt-16 gap-3">
        <Avatar user={partner} size={88} dot={false} />
        <p className="text-white font-bold text-2xl mt-2">{partner.display_name}</p>
        <p className="text-white/70 text-sm">{status === "В сети" ? formatDur(duration) : status}</p>
        {callType === "audio" && status === "Вызов..." && (
          <div className="flex gap-1 mt-1">
            {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
          </div>
        )}
      </div>

      {callType === "video" && (
        <div className="absolute top-4 right-4 z-20 w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
          <video ref={localVideoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        </div>
      )}

      <div className="absolute bottom-10 sm:bottom-12 left-0 right-0 z-10 flex justify-center gap-4 sm:gap-5">
        <button onClick={toggleMic}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg p-3 sm:p-0
            ${micMuted ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
          <Icon name={micMuted ? "MicOff" : "Mic"} size={22} className="text-white" />
        </button>
        {callType === "video" && (
          <button onClick={toggleCam}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg p-3 sm:p-0
              ${camOff ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
            <Icon name={camOff ? "VideoOff" : "Video"} size={22} className="text-white" />
          </button>
        )}
        <button onClick={handleEnd}
          className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-xl hover:bg-destructive/90 transition-all">
          <Icon name="PhoneOff" size={28} className="text-white" />
        </button>
        <button onClick={() => {
            setSpeakerOff(s => {
              const next = !s;
              if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
              if (remoteVideoRef.current) remoteVideoRef.current.muted = next;
              return next;
            });
          }}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg p-3 sm:p-0
            ${speakerOff ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
          <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Settings: Storage Tab ────────────────────────────────────────────────────
function StorageTab({ settings, set }: { settings: AppSettings; set: (p: Partial<AppSettings>) => void }) {
  const [cleared, setCleared] = useState(false);

  const cacheSize = (() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) total += (localStorage.getItem(key) || "").length * 2;
      }
      return total < 1024 ? `${total} Б` : total < 1048576 ? `${(total / 1024).toFixed(1)} КБ` : `${(total / 1048576).toFixed(1)} МБ`;
    } catch { return "—"; }
  })();

  const clearCache = () => {
    const keep = ["wc_token", "wc_settings", "wc_onboarded"];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !keep.includes(k)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    if ("caches" in window) caches.keys().then(names => names.forEach(n => caches.delete(n)));
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="space-y-2.5 animate-fade-in">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Данные и хранилище</p>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Локальный кэш приложения</span>
          <span className="text-xs font-mono text-muted-foreground">{cacheSize}</span>
        </div>
        <p className="text-xs text-muted-foreground">Настройки, история и временные данные</p>
      </div>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Автозагрузка</p>

      {([
        { key: "autoDownloadImages" as const, label: "Фотографии", desc: "Загружать автоматически", icon: "Image" },
        { key: "autoDownloadVideos" as const, label: "Видео", desc: "Видеофайлы (расход трафика)", icon: "Video" },
        { key: "autoDownloadDocs" as const, label: "Файлы и документы", desc: "PDF, архивы, таблицы", icon: "FileText" },
      ] as { key: keyof AppSettings; label: string; desc: string; icon: string }[]).map(item => (
        <div key={String(item.key)} className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Icon name={item.icon} size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          </div>
          <button onClick={() => set({ [item.key]: !settings[item.key] } as Partial<AppSettings>)}
            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings[item.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings[item.key] ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon name="Download" size={16} className="text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">Сохранять в галерею</div>
            <div className="text-xs text-muted-foreground">Медиа сохраняется на устройство</div>
          </div>
        </div>
        <button onClick={() => set({ saveToGallery: !settings.saveToGallery })}
          className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.saveToGallery ? "bg-primary" : "bg-muted-foreground/30"}`}>
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.saveToGallery ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
        </button>
      </div>

      {cleared ? (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-2xl">
          <Icon name="CheckCircle" size={14} className="text-green-500" />
          <p className="text-xs text-green-600 font-medium">Кэш успешно очищен</p>
        </div>
      ) : (
        <button onClick={clearCache}
          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2">
          <Icon name="Trash2" size={16} />Очистить кэш приложения
        </button>
      )}
    </div>
  );
}

// ─── Settings: Devices Tab ────────────────────────────────────────────────────
function DevicesTab({ onLogout }: { onLogout: () => void }) {
  const os = detectOS();
  const browser = detectBrowser();
  const isMobile = os === "iOS" || os === "Android";
  const [confirmLogout, setConfirmLogout] = useState(false);

  const deviceInfo = [
    { label: "Браузер", value: browser },
    { label: "Операционная система", value: os },
    { label: "Платформа", value: navigator.platform || "Неизвестно" },
    { label: "Язык системы", value: navigator.language },
    { label: "Подключение", value: navigator.onLine ? "Онлайн" : "Офлайн" },
    { label: "Тип экрана", value: `${window.screen.width}×${window.screen.height}` },
  ];

  return (
    <div className="space-y-2.5 animate-fade-in">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Активные сессии</p>

      <div className="p-3.5 bg-card rounded-2xl border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name={isMobile ? "Smartphone" : "Monitor"} size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{os} · {browser}</span>
              <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">Текущая</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Активна сейчас</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-2xl text-center space-y-1">
        <Icon name="ShieldCheck" size={22} className="text-muted-foreground mx-auto opacity-50" />
        <p className="text-sm font-medium text-muted-foreground">Других активных сессий нет</p>
        <p className="text-xs text-muted-foreground">Ваш аккаунт открыт только на этом устройстве</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Информация об устройстве</p>
        </div>
        {deviceInfo.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-xs font-medium text-right max-w-[60%] truncate">{row.value}</span>
          </div>
        ))}
      </div>

      {confirmLogout ? (
        <div className="p-3.5 bg-destructive/10 rounded-2xl border border-destructive/20 space-y-3">
          <p className="text-sm text-center font-medium">Выйти из аккаунта на этом устройстве?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmLogout(false)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Отмена</button>
            <button onClick={onLogout}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">Выйти</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmLogout(true)}
          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2">
          <Icon name="LogOut" size={15} />Завершить сессию (выйти из аккаунта)
        </button>
      )}
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
export function SettingsScreen({ user, settings, onSettings, onLogout, onAvatarUpload, avatarUploading, avatarInputRef, onUpdateProfile }: {
  user: User; settings: AppSettings;
  onSettings: (s: AppSettings) => void;
  onLogout: () => void;
  onAvatarUpload: (f: File) => void;
  avatarUploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  onUpdateProfile: (display_name: string, username: string) => Promise<string | null>;
}) {
  const [tab, setTab] = useState<"profile" | "appearance" | "notifications" | "privacy" | "storage" | "devices" | "language">("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.display_name);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editBio, setEditBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const t = useT(settings.language);
  const set = (p: Partial<AppSettings>) => onSettings({ ...settings, ...p });

  const saveProfile = async () => {
    setProfileSaving(true); setProfileError(""); setProfileSuccess(false);
    const err = await onUpdateProfile(editName.trim(), editUsername.trim());
    setProfileSaving(false);
    if (err) { setProfileError(err); }
    else { setProfileSuccess(true); setEditingProfile(false); setTimeout(() => setProfileSuccess(false), 3000); }
  };

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
    { id: "privacy", icon: "Shield", label: "Конфиденц." },
    { id: "storage", icon: "HardDrive", label: "Данные" },
    { id: "devices", icon: "Monitor", label: "Устройства" },
    { id: "language", icon: "Globe", label: "Язык" },
  ] as const;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-border shrink-0 scrollbar-none">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all
              ${tab === tb.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon name={tb.icon} size={13} />{tb.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="space-y-3 animate-fade-in">
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
                  onChange={e => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{user.display_name}</div>
                <div className="text-sm text-muted-foreground">@{user.username}</div>
              </div>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-600 text-sm">
                <Icon name="CheckCircle" size={14} />{t("profile_saved")}
              </div>
            )}

            {!editingProfile ? (
              <>
                <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                  {[
                    { icon: "User", label: t("name"), value: user.display_name },
                    { icon: "AtSign", label: t("username"), value: `@${user.username}` },
                    { icon: "FileText", label: "О себе", value: editBio || "Не указано" },
                    { icon: "Shield", label: t("encryption"), value: "AES-512 E2E" },
                    { icon: "Calendar", label: "В WorChat с", value: "2024" },
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
                <button onClick={() => { setEditingProfile(true); setEditName(user.display_name); setEditUsername(user.username); setProfileError(""); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors">
                  <Icon name="Pencil" size={15} />{t("edit_profile")}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t("display_name")}</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    maxLength={64}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={t("display_name")} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">@{t("username")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <input value={editUsername} onChange={e => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                      maxLength={32}
                      className="w-full pl-7 pr-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="username" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("username_hint")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">О себе</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)}
                    maxLength={140} rows={2} placeholder="Расскажите о себе..."
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  <p className="text-xs text-muted-foreground text-right">{editBio.length}/140</p>
                </div>
                {profileError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs">
                    <Icon name="AlertCircle" size={13} />{profileError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProfile(false); setProfileError(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                    {t("cancel")}
                  </button>
                  <button onClick={saveProfile} disabled={profileSaving || !editName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {profileSaving
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name="Check" size={15} />}
                    {t("save")}
                  </button>
                </div>
              </div>
            )}

            <button onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 text-destructive text-sm font-medium">
              <Icon name="LogOut" size={16} />{t("logout")}
            </button>
          </div>
        )}

        {/* APPEARANCE */}
        {tab === "appearance" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тема</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "system" as Theme, icon: "Monitor", label: "Системная" },
                  { value: "light" as Theme, icon: "Sun", label: "Светлая" },
                  { value: "dark" as Theme, icon: "Moon", label: "Тёмная" },
                ] as { value: Theme; icon: string; label: string }[]).map(th => (
                  <button key={th.value} onClick={() => set({ theme: th.value })}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all
                      ${settings.theme === th.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}>
                    <Icon name={th.icon} size={20} className={settings.theme === th.value ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-xs font-medium ${settings.theme === th.value ? "text-primary" : "text-muted-foreground"}`}>{th.label}</span>
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
                    className={`py-2.5 rounded-2xl border-2 text-sm font-medium transition-all
                      ${settings.fontSize === fs.v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}>
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="space-y-2.5 animate-fade-in">
            {"Notification" in window && Notification.permission === "default" && (
              <div className="flex items-center gap-3 p-3.5 bg-primary/10 rounded-2xl border border-primary/20">
                <Icon name="Bell" size={18} className="text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Разрешите уведомления браузера</p>
                  <p className="text-xs text-muted-foreground">Для показа уведомлений о новых сообщениях</p>
                </div>
                <button onClick={() => Notification.requestPermission().then(() => set({ notifications: true }))}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-medium shrink-0 hover:bg-primary/90 transition-colors">
                  Разрешить
                </button>
              </div>
            )}
            {"Notification" in window && Notification.permission === "granted" && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-2xl">
                <Icon name="CheckCircle" size={14} className="text-green-500 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Браузерные уведомления разрешены</p>
              </div>
            )}
            {"Notification" in window && Notification.permission === "denied" && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-2xl">
                <Icon name="XCircle" size={14} className="text-destructive shrink-0" />
                <div>
                  <p className="text-xs text-destructive font-medium">Уведомления заблокированы</p>
                  <p className="text-xs text-muted-foreground">Разрешите в настройках сайта (замок в адресной строке)</p>
                </div>
              </div>
            )}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Типы уведомлений</p>
            {([
              { key: "notifications" as const, label: "Push-уведомления", desc: "Показывать уведомления в браузере", icon: "Bell" },
              { key: "notifSound" as const, label: "Звуковые сигналы", desc: "Воспроизводить звук при сообщении", icon: "Volume2" },
              { key: "notifPreview" as const, label: "Предпросмотр текста", desc: "Показывать текст в уведомлении", icon: "Eye" },
              { key: "notifCalls" as const, label: "Звонки", desc: "Уведомлять о входящих звонках", icon: "Phone" },
              { key: "notifChannels" as const, label: "Каналы", desc: "Новые посты в подписках", icon: "Rss" },
            ] as { key: keyof AppSettings; label: string; desc: string; icon: string }[]).map(item => (
              <div key={String(item.key)} className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <button onClick={() => {
                  const newVal = !settings[item.key];
                  if (item.key === "notifications" && newVal && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission();
                  }
                  set({ [item.key]: newVal } as Partial<AppSettings>);
                }}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings[item.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings[item.key] ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            {settings.notifSound && (
              <button onClick={() => {
                try {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain); gain.connect(ctx.destination);
                  osc.frequency.setValueAtTime(880, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                  osc.start(); osc.stop(ctx.currentTime + 0.3);
                } catch { /* ignore */ }
              }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm text-muted-foreground transition-colors">
                <Icon name="Volume2" size={14} />Тест звука уведомления
              </button>
            )}
            <div className="p-3.5 bg-muted/50 rounded-2xl">
              <p className="text-xs text-muted-foreground">Настройки уведомлений отдельных чатов доступны в самом чате.</p>
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {tab === "privacy" && (
          <div className="space-y-2.5 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Видимость данных</p>
            {([
              { key: "privacyLastSeen" as const, label: "Время последнего визита", icon: "Clock" },
              { key: "privacyAvatar" as const, label: "Фото профиля", icon: "UserCircle" },
              { key: "privacyForwards" as const, label: "Пересылка сообщений", icon: "Forward" },
            ] as { key: "privacyLastSeen" | "privacyAvatar" | "privacyForwards"; label: string; icon: string }[]).map(item => {
              const val = settings[item.key] as "all" | "contacts" | "nobody";
              return (
                <div key={item.key} className="p-3.5 bg-card rounded-2xl border border-border space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon name={item.icon} size={15} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {([{ v: "all", label: "Все" }, { v: "contacts", label: "Контакты" }, { v: "nobody", label: "Никто" }] as { v: "all" | "contacts" | "nobody"; label: string }[]).map(o => (
                      <button key={o.v} onClick={() => set({ [item.key]: o.v } as Partial<AppSettings>)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all
                          ${val === o.v ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Чаты</p>
            {([
              { key: "privacyReadReceipts" as const, label: "Отметки о прочтении", desc: "Показывать галочки «прочитано»", icon: "CheckCheck" },
              { key: "privacyTyping" as const, label: "Статус «печатает»", desc: "Показывать другим, что вы пишете", icon: "MessageSquare" },
            ] as { key: keyof AppSettings; label: string; desc: string; icon: string }[]).map(item => (
              <div key={String(item.key)} className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <button onClick={() => set({ [item.key]: !settings[item.key] } as Partial<AppSettings>)}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings[item.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings[item.key] ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <div className="p-3.5 bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-900/50">
              <div className="flex items-center gap-2.5 mb-1.5">
                <Icon name="Shield" size={15} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Сквозное шифрование</span>
              </div>
              <p className="text-xs text-muted-foreground">Все сообщения защищены AES-512 E2E. Даже серверы WorChat не могут прочитать вашу переписку.</p>
            </div>
          </div>
        )}

        {/* STORAGE */}
        {tab === "storage" && (
          <StorageTab settings={settings} set={set} />
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <DevicesTab onLogout={onLogout} />
        )}

        {/* LANGUAGE */}
        {tab === "language" && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("language")}</p>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => set({ language: l.code })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all
                      ${settings.language === l.code ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>
                    <span>{l.flag}</span><span className="truncate">{l.label}</span>
                    {settings.language === l.code && <Icon name="Check" size={13} className="ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Регион</p>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map(r => (
                  <button key={r.code} onClick={() => set({ region: r.code })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all
                      ${settings.region === r.code ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>
                    <span>{r.flag}</span><span className="truncate">{r.label}</span>
                    {settings.region === r.code && <Icon name="Check" size={13} className="ml-auto shrink-0" />}
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

// ─── Create Channel Modal ─────────────────────────────────────────────────────
export function CreateChannelModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, description: string, isPublic: boolean, category: string, username: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [category, setCategory] = useState("general");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const CATEGORIES = [
    { id: "general", label: "Общее", icon: "Globe" },
    { id: "news", label: "Новости", icon: "Newspaper" },
    { id: "tech", label: "Технологии", icon: "Cpu" },
    { id: "entertainment", label: "Развлечения", icon: "Smile" },
    { id: "education", label: "Образование", icon: "BookOpen" },
    { id: "business", label: "Бизнес", icon: "Briefcase" },
    { id: "sport", label: "Спорт", icon: "Trophy" },
    { id: "art", label: "Творчество", icon: "Palette" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Создать канал</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>

        {/* Steps */}
        <div className="flex gap-1">
          {[1, 2].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название канала *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Мой канал" maxLength={64}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{name.length}/64</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={255}
                placeholder="О чём ваш канал..."
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Категория</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center
                      ${category === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <Icon name={c.icon} size={16} className={category === c.id ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-[10px] font-medium leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50">
              Далее
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">@username канала</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  placeholder="my_channel" maxLength={32}
                  className="w-full pl-7 pr-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Уникальная ссылка для поиска (необязательно)</p>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
              <div>
                <div className="text-sm font-medium">Публичный канал</div>
                <div className="text-xs text-muted-foreground">Виден в поиске, может подписаться любой</div>
              </div>
              <button onClick={() => setIsPublic(!isPublic)}
                className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${isPublic ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all" style={{ left: isPublic ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle" size={12} className="text-green-500 shrink-0" />
                <span>Название: <strong>{name}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle" size={12} className="text-green-500 shrink-0" />
                <span>Категория: <strong>{CATEGORIES.find(c => c.id === category)?.label}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle" size={12} className="text-green-500 shrink-0" />
                <span>Тип: <strong>{isPublic ? "Публичный" : "Приватный"}</strong></span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted">Назад</button>
              <button onClick={() => onCreate(name, desc, isPublic, category, username)}
                disabled={!name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Создать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Channel Modal ───────────────────────────────────────────────────────
export function EditChannelModal({ channel, onClose, onSave, onDelete, onUploadAvatar }: {
  channel: Channel;
  onClose: () => void;
  onSave: (id: number, fields: { name?: string; description?: string; is_public?: boolean }) => void;
  onDelete: (id: number) => void;
  onUploadAvatar: (file: File) => void;
}) {
  const [name, setName] = useState(channel.name);
  const [desc, setDesc] = useState(channel.description || "");
  const [isPublic, setIsPublic] = useState(channel.is_public);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "members" | "stats">("info");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUploadAvatar(file);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Управление каналом</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-0.5">
          {(["info", "members", "stats"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {t === "info" ? "Инфо" : t === "members" ? "Участники" : "Статистика"}
            </button>
          ))}
        </div>

        {activeTab === "info" && (
          <>
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
          </>
        )}

        {activeTab === "members" && (
          <div className="space-y-3">
            <div className="text-center py-4 text-muted-foreground">
              <Icon name="Users" size={32} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm">{channel.members_count.toLocaleString()} подписчиков</p>
              <p className="text-xs mt-1">Управление подписчиками доступно в расширенной версии</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Link" size={14} className="text-primary" />
                <span className="text-xs font-medium">Пригласительная ссылка</span>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <span className="text-xs flex-1 truncate text-muted-foreground">https://worchat.app/c/{channel.slug || "..."}</span>
                <button onClick={() => navigator.clipboard.writeText(`https://worchat.app/c/${channel.slug || channel.id}`)}
                  className="text-primary shrink-0">
                  <Icon name="Copy" size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="space-y-3">
            {[
              { label: "Подписчиков", value: channel.members_count.toLocaleString(), icon: "Users", color: "text-blue-500" },
              { label: "Постов всего", value: "—", icon: "FileText", color: "text-purple-500" },
              { label: "Просмотров (24ч)", value: "—", icon: "Eye", color: "text-green-500" },
              { label: "Реакций", value: "—", icon: "Heart", color: "text-red-500" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Icon name={s.icon} size={16} className={s.color} />
                </div>
                <span className="flex-1 text-sm">{s.label}</span>
                <span className="font-bold text-sm">{s.value}</span>
              </div>
            ))}
          </div>
        )}

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
export function PaymentModal({
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-base font-bold">
            {step === "select" ? "Оформить подписку" : step === "form" ? "Оплата" : "Готово!"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"><Icon name="X" size={16} /></button>
        </div>

        {step === "select" && (
          <div className="px-6 pb-6 space-y-4">
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
              <div className="text-2xl font-bold mt-1">{amount}₽</div>
            </div>
            <button onClick={() => onInitiate(plan, period)} disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Оформить за {amount}₽
            </button>
          </div>
        )}

        {step === "form" && (
          <div className="px-6 pb-6 space-y-4">
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {(["card","sbp"] as const).map(m => (
                <button key={m} onClick={() => onSetMethod(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                    ${method === m ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
                  <Icon name={m === "card" ? "CreditCard" : "Smartphone"} size={14} />
                  {m === "card" ? "Карта" : "СБП"}
                </button>
              ))}
            </div>
            {method === "card" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Номер карты</label>
                  <input value={formatCard(cardNumber)} onChange={e => onSetCardNumber(e.target.value.replace(/\D/g,""))}
                    placeholder="0000 0000 0000 0000" inputMode="numeric"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Срок</label>
                    <input value={formatExpiry(cardExpiry)} onChange={e => onSetCardExpiry(e.target.value.replace(/\D/g,""))}
                      placeholder="MM/YY" inputMode="numeric" maxLength={5}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">CVV</label>
                    <input value={cardCvv} onChange={e => onSetCardCvv(e.target.value.replace(/\D/g,"").slice(0,3))}
                      placeholder="•••" inputMode="numeric" maxLength={3} type="password"
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Имя на карте</label>
                  <input value={cardName} onChange={e => onSetCardName(e.target.value.toUpperCase())}
                    placeholder="IVAN PETROV"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-40 h-40 bg-muted rounded-2xl flex items-center justify-center">
                  <div className="text-xs text-center text-muted-foreground">QR-код СБП<br />появится здесь</div>
                </div>
                <p className="text-sm text-center text-muted-foreground max-w-[200px]">Откройте банковское приложение и отсканируйте QR-код для оплаты</p>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-t border-border text-sm">
              <span className="text-muted-foreground">Итого</span>
              <span className="font-bold">{amount}₽/{periodLabel}</span>
            </div>
            <button onClick={onConfirm} disabled={loading || (method === "card" && (!cardNumber || !cardExpiry || !cardCvv))}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Оплатить {amount}₽
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="px-6 pb-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-xl mt-2">
              <Icon name="Check" size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Оплата прошла!</p>
              <p className="text-sm text-muted-foreground mt-1">Подписка {info.name} активирована</p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90">Отлично!</button>
          </div>
        )}
      </div>
    </div>
  );
}