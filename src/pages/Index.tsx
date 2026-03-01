import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const AUTH_URL = func2url.auth;
const CHATS_URL = func2url.chats;
const MESSAGES_URL = func2url.messages;

// ─── Types ─────────────────────────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_initials: string;
  status: string;
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
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold`}
        style={{ background: user.avatar_color }}>
        {user.avatar_initials || user.display_name?.slice(0, 2).toUpperCase()}
      </div>
      {dot && user.status === "online" && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
      )}
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check session on load
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const logout = async () => {
    await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "logout" }) });
    localStorage.removeItem("wc_token");
    setUser(null);
    setChats([]); setContacts([]); setActiveChat(null); setMessages([]);
  };

  const openChat = (chat: ChatItem) => {
    setActiveChat(chat);
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

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const { ok, data } = await apiFetch(MESSAGES_URL, {
      method: "POST",
      body: JSON.stringify({ action: "send", chat_id: activeChat.chat_id, text })
    });
    if (ok) {
      setMessages((prev) => [...prev, data.message]);
      loadChats();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
            onClick={() => setSection(item.id)}
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
          <button onClick={() => setSection("profile")}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all
              ${section === "profile" ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-border hover:ring-offset-1"}`}
            style={{ background: user.avatar_color }}>
            {user.avatar_initials}
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
              {section === "bots" && "Боты"}
              {section === "calls" && "Звонки"}
              {section === "contacts" && "Контакты"}
              {section === "archive" && "Архив"}
              {section === "search" && "Поиск"}
              {section === "settings" && "Настройки"}
              {section === "profile" && "Профиль"}
            </h2>
          </div>
          {(section === "chats" || section === "contacts" || section === "search" || section === "channels" || section === "bots") && (
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
                  <p className="text-sm">Нет чатов. Перейдите в «Контакты», чтобы начать беседу.</p>
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
                        {c.last_text
                          ? (c.last_sender_id === user.id ? `Вы: ${c.last_text}` : c.last_text)
                          : "Нет сообщений"}
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
          {section === "bots" && (
            <div className="px-4 py-2">
              {[
                { name: "ChatGPT Bot", sub: "ИИ-ассистент", icon: "Sparkles", color: "#10b981", badge: "ИИ" },
                { name: "Переводчик", sub: "Перевод на 100+ языков", icon: "Languages", color: "#6366f1", badge: "" },
                { name: "Погода", sub: "Прогноз на 7 дней", icon: "CloudSun", color: "#0ea5e9", badge: "" },
                { name: "Напоминания", sub: "Умный планировщик", icon: "BellRing", color: "#f59e0b", badge: "" },
              ].map((bot) => (
                <button key={bot.name}
                  className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: bot.color }}>
                    <Icon name={bot.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{bot.name}</span>
                      {bot.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{bot.badge}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{bot.sub}</div>
                  </div>
                  <Icon name="ChevronRight" size={15} className="text-muted-foreground shrink-0" />
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-border">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:bg-muted/60 transition-colors text-muted-foreground text-sm">
                  <Icon name="Search" size={16} />
                  Найти бота
                </button>
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
                          <Icon
                            name={type === "in" ? "PhoneIncoming" : type === "out" ? "PhoneOutgoing" : "PhoneMissed"}
                            size={12}
                            className={type === "missed" ? "text-destructive" : "text-green-500"}
                          />
                          <span className={`text-xs ${type === "missed" ? "text-destructive" : "text-muted-foreground"}`}>
                            {times[i]}
                          </span>
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
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: user.avatar_color }}>
                  {user.avatar_initials}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-base">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  В сети
                </div>
              </div>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-destructive text-sm font-medium mt-2">
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
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-slide-up`}
                  style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}>
                  <div className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.out ? "msg-out rounded-br-sm" : "msg-in rounded-bl-sm shadow-sm border border-border"}`}>
                    <span>{msg.text}</span>
                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.out ? "text-white/70" : "text-muted-foreground"}`}>
                      <span className="text-[10px]">{msg.time}</span>
                      {msg.out && (msg.status === "read"
                        ? <Icon name="CheckCheck" size={12} />
                        : <Icon name="Check" size={12} />)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-white border-t border-border shrink-0">
              <div className="flex items-end gap-2">
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0">
                  <Icon name="Paperclip" size={18} className="text-muted-foreground" />
                </button>
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Сообщение..." rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground transition-all max-h-32 overflow-auto"
                  style={{ lineHeight: "1.5" }} />
                <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0">
                  <Icon name="Smile" size={18} className="text-muted-foreground" />
                </button>
                <button onClick={sendMessage} disabled={!input.trim() || sending}
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