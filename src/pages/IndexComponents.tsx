import React, { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { User, Message, CallSession, AppSettings, Accent, Theme, Wallpaper, DeviceInfo, Channel, LANGUAGES, REGIONS, useT } from "./IndexTypes";
import { apiFetch, formatBytes, formatPhone, detectBrowser, detectOS, AUTH_URL, CALLS_URL, UPLOAD_URL } from "@/lib/api";

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

// ─── Message Bubble ───────────────────────────────────────────────────────────
export function MessageBubble({ msg, allMessages }: { msg: Message; allMessages: Message[] }) {
  const reply = msg.reply_to_id ? allMessages.find(m => m.id === msg.reply_to_id) : null;
  const renderContent = () => {
    if (msg.msg_type === "image" && msg.media_url) return (
      <div>{reply && <ReplyPreview msg={reply} />}
        <img src={msg.media_url} alt="фото" className="max-w-[220px] sm:max-w-xs rounded-xl cursor-pointer"
          onClick={() => window.open(msg.media_url, "_blank")} />
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
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/20">
          <video src={msg.media_url} controls className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] opacity-70">Видеосообщение</span>
      </div>
    );
    if (msg.msg_type === "voice" && msg.media_url) return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon name="Mic" size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <audio src={msg.media_url} controls className="h-7 max-w-[140px] sm:max-w-[180px]"
            style={{ filter: "invert(1) hue-rotate(180deg)" }} />
          {(msg as { media_duration?: number }).media_duration && (
            <p className="text-[10px] opacity-70 mt-0.5">
              {Math.floor(((msg as { media_duration?: number }).media_duration || 0) / 60).toString().padStart(2,"0")}:{String(((msg as { media_duration?: number }).media_duration || 0) % 60).padStart(2,"0")}
            </p>
          )}
        </div>
      </div>
    );
    if (msg.msg_type === "audio" && msg.media_url) return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Icon name="Music" size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium truncate max-w-[120px] sm:max-w-[140px]">{msg.media_name || "Аудио"}</p>
          <audio src={msg.media_url} controls className="h-7 max-w-[120px] sm:max-w-[140px]" />
          {msg.media_size && <p className="text-[10px] opacity-70 mt-0.5">{formatBytes(msg.media_size)}</p>}
        </div>
      </div>
    );
    if (msg.msg_type === "document" && msg.media_url) return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2.5 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors min-w-[160px]">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon name="FileText" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{msg.media_name || "Файл"}</p>
          {msg.media_size && <p className="text-[10px] opacity-70">{formatBytes(msg.media_size)}</p>}
        </div>
        <Icon name="Download" size={14} className="opacity-70 shrink-0" />
      </a>
    );
    if (msg.msg_type === "geo" && msg.geo_lat) return (
      <a href={`https://maps.google.com/?q=${msg.geo_lat},${msg.geo_lon}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-green-400/30 flex items-center justify-center">
          <Icon name="MapPin" size={18} className="text-green-300" />
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

// ─── Voice Recorder ───────────────────────────────────────────────────────────
export function VoiceRecorder({ onSend, onCancel }: {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
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
    } catch {
      onCancel();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
      <div className="flex-1 flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
        <span className="text-sm text-destructive font-medium">{fmt(duration)}</span>
        <div className="flex-1 flex gap-0.5 items-center">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 bg-destructive/40 rounded-full animate-pulse"
              style={{ height: `${4 + Math.random() * 12}px`, animationDelay: `${i * 100}ms` }} />
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
    } catch {
      onCancel();
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
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = micMuted; });
    setMicMuted(m => !m);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
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
        <button onClick={() => setSpeakerOff(s => !s)}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg p-3 sm:p-0
            ${speakerOff ? "bg-white/20 ring-2 ring-red-400" : "bg-white/15 hover:bg-white/25"}`}>
          <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} className="text-white" />
        </button>
      </div>
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

  const devices: DeviceInfo[] = [
    { name: `${detectOS()} · ${detectBrowser()}`, os: detectOS(), browser: detectBrowser(), current: true },
    { name: "iPhone 15 · Safari", os: "iOS", browser: "Safari", current: false },
  ];

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
          <div className="space-y-2 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Уведомления</p>
            {[
              { key: "notifications", label: "Уведомления", desc: "Получать push-уведомления", icon: "Bell" },
              { key: "notifSound", label: "Звук", desc: "Звуковые сигналы при сообщениях", icon: "Volume2" },
              { key: "notifPreview", label: "Предпросмотр", desc: "Показывать текст в уведомлении", icon: "Eye" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Icon name={item.icon} size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <button onClick={() => set({ [item.key]: !settings[item.key as keyof AppSettings] } as Partial<AppSettings>)}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings[item.key as keyof AppSettings] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings[item.key as keyof AppSettings] ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <div className="mt-3 p-3.5 bg-muted/50 rounded-2xl">
              <p className="text-xs text-muted-foreground">Уведомления для конкретных чатов можно настроить в самом чате.</p>
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {tab === "privacy" && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Конфиденциальность</p>
            {[
              { label: "Фото профиля", value: "Все" },
              { label: "Статус онлайн", value: "Все" },
              { label: "Прочитано", value: "Все" },
              { label: "Переадресация", value: "Контакты" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3.5 bg-card rounded-2xl border border-border">
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
                  <span>{item.value}</span>
                  <Icon name="ChevronRight" size={14} />
                </div>
              </div>
            ))}
            <div className="p-3.5 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="Shield" size={16} className="text-green-500" />
                <span className="text-sm font-medium">Сквозное шифрование</span>
              </div>
              <p className="text-xs text-muted-foreground">Все сообщения защищены AES-512. Никто, включая WorChat, не может прочитать ваши переписки.</p>
            </div>
            <div className="p-3.5 bg-card rounded-2xl border border-border">
              <p className="text-sm font-medium mb-1.5">Блокировки</p>
              <p className="text-xs text-muted-foreground">Нет заблокированных пользователей</p>
            </div>
          </div>
        )}

        {/* STORAGE */}
        {tab === "storage" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Данные и хранилище</p>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Использование</span>
                <span className="text-xs text-muted-foreground">128 МБ из 1 ГБ</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "12%" }} />
              </div>
            </div>
            {[
              { label: "Фотографии", size: "42 МБ", icon: "Image" },
              { label: "Видео", size: "68 МБ", icon: "Video" },
              { label: "Файлы", size: "14 МБ", icon: "FileText" },
              { label: "Аудио", size: "4 МБ", icon: "Music" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3 bg-card rounded-2xl border border-border">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={item.icon} size={16} className="text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.size}</span>
              </div>
            ))}
            <button className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2">
              <Icon name="Trash2" size={16} />Очистить кэш
            </button>
          </div>
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Активные сессии</p>
            {devices.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={d.os === "iOS" || d.os === "Android" ? "Smartphone" : "Monitor"} size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.os} · {d.browser}</div>
                </div>
                {d.current ? (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">Текущий</span>
                ) : (
                  <button className="text-xs text-destructive hover:underline shrink-0">Выйти</button>
                )}
              </div>
            ))}
            <button className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
              Завершить все другие сессии
            </button>
          </div>
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
