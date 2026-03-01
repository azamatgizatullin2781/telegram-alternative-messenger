import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const AUTH_URL = func2url.auth;
const CHATS_URL = func2url.chats;
const MESSAGES_URL = func2url.messages;
const BOT_URL = func2url.bot;
const UPLOAD_URL = func2url.upload;

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── API helpers ────────────────────────────────────────────────────────────
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

// ─── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", display_name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body: Record<string, string> = { action: mode, username: form.username, password: form.password };
    if (mode === "register") body.display_name = form.display_name;
    const { ok, data } = await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify(body) });
    setLoading(false);
    if (!ok) { setError(data.error || "Ошибка"); return; }
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Логин</label>
              <input type="text" value={form.username} onChange={(e) => set("username", e.target.value)}
                placeholder="username" required autoComplete="username"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            {mode === "register" && (
              <div className="animate-fade-in">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Имя</label>
                <input type="text" value={form.display_name} onChange={(e) => set("display_name", e.target.value)}
                  placeholder="Иван Иванов" required
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

// ─── Avatar ─────────────────────────────────────────────────────────────────
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

// ─── Stellar Badge ────────────────────────────────────────────────────────
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

// ─── Message bubble renderers ─────────────────────────────────────────────
function MessageBubble({ msg, allMessages }: { msg: Message; allMessages: Message[] }) {
  const replyMsg = msg.reply_to_id ? allMessages.find(m => m.id === msg.reply_to_id) : null;

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

function ReplyPreview({ msg }: { msg: Message }) {
  return (
    <div className="border-l-2 border-white/50 pl-2 mb-1.5 opacity-80">
      <p className="text-[11px] truncate max-w-[180px]">{msg.text || "[медиа]"}</p>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
type Section = "chats" | "channels" | "bots" | "calls" | "contacts" | "archive" | "search" | "settings" | "profile";

export default function Index() {
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
  // Bot
  const [botMessages, setBotMessages] = useState<BotMessage[]>([]);
  const [botInput, setBotInput] = useState("");
  const [botSending, setBotSending] = useState(false);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botEndRef = useRef<HTMLDivElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Bot load
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
    setMobileView("chat");
  };

  const startChatWithContact = async (contact: User) => {
    const { ok, data } = await apiFetch(CHATS_URL, {
      method: "POST",
      body: JSON.stringify({ action: "start", partner_id: contact.id })
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
    await sendMessage({
      msg_type: msgType,
      media_url: data.url,
      media_name: file.name,
      media_size: file.size,
      text: "",
    });
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
      (pos) => {
        sendMessage({ msg_type: "geo", geo_lat: pos.coords.latitude, geo_lon: pos.coords.longitude, text: "" });
      },
      () => alert("Нет доступа к геолокации"),
    );
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
    const { ok, data } = await apiFetch(BOT_URL, { method: "POST", body: JSON.stringify({ action: "pay_subscription", plan: "stellar" }) });
    if (ok) {
      await loadSubscription();
      await loadBotHistory();
    }
    setSubLoading(false);
  };

  const filteredChats = chats.filter((c) =>
    c.partner.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar nav */}
      <nav className="w-16 flex flex-col items-center py-4 gap-1 border-r border-border bg-white shrink-0">
        <div className="mb-4 w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
          <Icon name="Lock" size={18} className="text-white" />
        </div>
        {navItems.map((item) => (
          <button key={item.id}
            onClick={() => { setSection(item.id); setActiveBotId(null); }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 relative
              ${section === item.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title={item.label}>
            <Icon name={item.icon} size={20} />
            {item.id === "chats" && totalUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            )}
          </button>
        ))}
        <div className="mt-auto">
          <button onClick={() => { setSection("profile"); setActiveBotId(null); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all overflow-hidden
              ${section === "profile" ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-border hover:ring-offset-1"}`}
            style={!user.avatar_url ? { background: user.avatar_color } : {}}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : user.avatar_initials}
          </button>
        </div>
      </nav>

      {/* Panel */}
      <div className={`w-80 shrink-0 border-r border-border bg-white flex flex-col ${mobileView === "chat" ? "hidden md:flex" : "flex"} md:flex`}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {section === "chats" && "Сообщения"}
              {section === "channels" && "Каналы"}
              {section === "bots" && (activeBotId ? "WorChat Bot" : "Боты")}
              {section === "calls" && "Звонки"}
              {section === "contacts" && "Контакты"}
              {section === "archive" && "Архив"}
              {section === "search" && "Поиск"}
              {section === "settings" && "Настройки"}
              {section === "profile" && "Профиль"}
            </h2>
            {section === "bots" && activeBotId && (
              <button onClick={() => setActiveBotId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                ← Назад
              </button>
            )}
          </div>
          {(section === "chats" || section === "contacts" || section === "search" || section === "channels") && !activeBotId && (
            <div className="relative">
              <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Поиск..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground transition-all" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
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
                          <div className="text-xs text-muted-foreground">@{c.username}</div>
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
                          <div className="text-xs text-muted-foreground">@{c.username}</div>
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
                  <p className="text-sm">Введите имя или логин</p>
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
              {/* WorChat Bot — главный */}
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
                  <div className="text-xs text-muted-foreground">Приветствие · Stellar подписка · Помощь</div>
                </div>
                <Icon name="ChevronRight" size={15} className="text-muted-foreground shrink-0" />
              </button>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 px-2">Другие боты</div>
              {[
                { name: "Переводчик", sub: "Перевод на 100+ языков", icon: "Languages", color: "#6366f1" },
                { name: "Погода", sub: "Прогноз на 7 дней", icon: "CloudSun", color: "#0ea5e9" },
                { name: "Напоминания", sub: "Умный планировщик", icon: "BellRing", color: "#f59e0b" },
              ].map((bot) => (
                <button key={bot.name}
                  className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: bot.color }}>
                    <Icon name={bot.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{bot.name}</div>
                    <div className="text-xs text-muted-foreground">{bot.sub}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">Скоро</span>
                </button>
              ))}
            </div>
          )}

          {/* BOT CHAT */}
          {section === "bots" && activeBotId === "worchat_bot" && (
            <div className="flex flex-col h-full">
              {/* Bot header info */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                  <Icon name="Bot" size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    WorChat Bot <StellarBadge />
                  </div>
                  <div className="text-xs text-green-500">Всегда онлайн</div>
                </div>
                {subscription && (
                  <div className="ml-auto">
                    <StellarBadge size="lg" />
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: "hsl(220,15%,97%)" }}>
                {botMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "bot" && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mr-2 mt-auto"
                        style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                        <Icon name="Bot" size={14} />
                      </div>
                    )}
                    <div className={`max-w-[220px] px-3 py-2 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user" ? "msg-out rounded-br-sm text-white" : "bg-white rounded-bl-sm shadow-sm border border-border"}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {/* Subscription offer button */}
                      {msg.role === "bot" && (msg.extra as Record<string, unknown>)?.type === "subscription_offer" && !subscription && (
                        <button onClick={paySubscription} disabled={subLoading}
                          className="mt-2 w-full py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)" }}>
                          {subLoading ? "Оформляем..." : "⭐ Оформить Stellar — 299₽/мес"}
                        </button>
                      )}
                      <div className={`text-[10px] mt-0.5 text-right ${msg.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
                {botSending && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mr-2"
                      style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                      <Icon name="Bot" size={14} />
                    </div>
                    <div className="px-3 py-3 rounded-2xl bg-white border border-border shadow-sm flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={botEndRef} />
              </div>

              {/* Bot input */}
              <div className="px-3 py-3 bg-white border-t border-border">
                <div className="flex items-center gap-2">
                  <input value={botInput} onChange={(e) => setBotInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendBotMessage(); } }}
                    placeholder="Напишите боту..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={sendBotMessage} disabled={!botInput.trim() || botSending}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0
                      ${botInput.trim() && !botSending ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground"}`}>
                    <Icon name="Send" size={16} />
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {["/subscription", "/help", "Привет"].map(cmd => (
                    <button key={cmd} onClick={() => { setBotInput(cmd); }}
                      className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CALLS */}
          {section === "calls" && (
            <div className="px-4 py-2">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                  <Icon name="PhoneMissed" size={36} className="opacity-25" />
                  <p className="text-sm">Нет звонков</p>
                </div>
              ) : (
                contacts.slice(0, 6).map((c, i) => {
                  const types = ["in", "out", "missed"] as const;
                  const type = types[i % 3];
                  const times = ["Сегодня, 14:22", "Вчера, 09:10", "27 фев, 18:45", "26 фев, 12:00", "25 фев, 20:33", "24 фев, 08:15"];
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-3 px-2 hover:bg-muted/60 rounded-xl transition-colors">
                      <Avatar user={c} size={10} dot={false} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{c.display_name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Icon name={type === "in" ? "PhoneIncoming" : type === "out" ? "PhoneOutgoing" : "PhoneMissed"} size={12}
                            className={type === "missed" ? "text-destructive" : "text-green-500"} />
                          <span className={`text-xs ${type === "missed" ? "text-destructive" : "text-muted-foreground"}`}>{times[i]}</span>
                        </div>
                      </div>
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 hover:bg-green-100 transition-colors shrink-0">
                        <Icon name="Phone" size={16} className="text-green-600" />
                      </button>
                    </div>
                  );
                })
              )}
              {contacts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-green-700 text-sm font-medium">
                    <Icon name="Phone" size={16} />
                    Позвонить
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-medium">
                    <Icon name="Video" size={16} />
                    Видео
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {section === "settings" && (
            <div className="px-4 py-2">
              {[
                { icon: "Bell", label: "Уведомления", sub: "Включены" },
                { icon: "Lock", label: "Конфиденциальность", sub: "E2E шифрование активно" },
                { icon: "Palette", label: "Оформление", sub: "Светлая тема" },
                { icon: "Smartphone", label: "Устройства", sub: "1 активное" },
                { icon: "HelpCircle", label: "Помощь", sub: "" },
              ].map((item) => (
                <button key={item.label}
                  className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Icon name={item.icon} size={17} className="text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.sub && <div className="text-xs text-muted-foreground">{item.sub}</div>}
                  </div>
                  <Icon name="ChevronRight" size={16} className="ml-auto text-muted-foreground" />
                </button>
              ))}
              <button onClick={logout}
                className="w-full flex items-center gap-3 py-3 px-2 hover:bg-red-50 rounded-xl transition-colors text-left mt-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <Icon name="LogOut" size={17} className="text-destructive" />
                </div>
                <span className="text-sm font-medium text-destructive">Выйти</span>
              </button>
            </div>
          )}

          {/* PROFILE */}
          {section === "profile" && (
            <div className="px-4 py-4">
              <div className="flex flex-col items-center gap-3 py-4">
                {/* Avatar with upload */}
                <div className="relative group">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name}
                      className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                      style={{ background: user.avatar_color }}>
                      {user.avatar_initials}
                    </div>
                  )}
                  <button onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {avatarUploading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name="Camera" size={22} className="text-white" />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-base flex items-center gap-2 justify-center">
                    {user.display_name}
                    {subscription && <StellarBadge size="lg" />}
                  </div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  В сети
                </div>
              </div>

              {/* Stellar promo in profile */}
              {!subscription && (
                <button onClick={() => { setSection("bots"); setActiveBotId("worchat_bot"); }}
                  className="w-full mb-3 p-4 rounded-2xl text-white text-left"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)" }}>
                  <div className="text-sm font-bold mb-0.5">⭐ Получить Stellar</div>
                  <div className="text-xs opacity-90">Безлимит · Эксклюзив · 4K звонки · от 299₽/мес</div>
                </button>
              )}

              <button onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left mb-1">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Icon name="Camera" size={17} />
                </div>
                <span className="text-sm font-medium">Сменить фото профиля</span>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />

              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-destructive text-sm font-medium mt-3">
                <Icon name="LogOut" size={16} />
                Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${mobileView === "list" && !activeChat ? "hidden md:flex" : "flex"}`}>
        {activeChat ? (
          <>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-white shrink-0">
              <button onClick={() => setMobileView("list")}
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
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                  <Icon name="MoreVertical" size={17} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-100">
                <Icon name="Lock" size={11} className="text-green-500" />
                <span className="text-xs text-green-600 font-medium font-mono">Сквозное шифрование · WorChat</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1" style={{ background: "hsl(220,15%,97%)" }}>
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
                    {/* Reply button */}
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

            {/* Reply preview */}
            {replyTo && (
              <div className="px-4 py-2 bg-white border-t border-border flex items-center gap-2 shrink-0">
                <div className="flex-1 border-l-2 border-primary pl-2">
                  <p className="text-xs text-primary font-medium">Ответ</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.text || "[медиа]"}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted">
                  <Icon name="X" size={14} className="text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Attach menu */}
            {showAttach && (
              <div className="px-4 pb-2 bg-white border-t border-border shrink-0">
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

            <div className="px-4 py-3 bg-white border-t border-border shrink-0">
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8"
            style={{ background: "hsl(220,15%,97%)" }}>
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
    </div>
  );
}
