import React, { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  User, ChatItem, Message, BotMessage, CallSession, AppSettings,
  Section, ChatSearchTab, Channel, ChannelPost,
  DEFAULT_SETTINGS, useT,
} from "./IndexTypes";
import {
  apiFetch, fileToBase64, applyTheme,
  AUTH_URL, CHATS_URL, MESSAGES_URL, BOT_URL, UPLOAD_URL, CALLS_URL, CHANNELS_URL,
} from "@/lib/api";
import {
  OnboardingScreen, AuthScreen, Avatar, Badge,
  MessageBubble, IncomingCallModal, CallScreen,
  SettingsScreen, CreateChannelModal, EditChannelModal, PaymentModal,
  VoiceRecorder, VideoNoteRecorder, UserProfileModal, PhotoViewer,
  ToastProvider, useToast, requestNotificationPermission, showBrowserNotification,
} from "./IndexComponents";

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Index() {
  return <ToastProvider><IndexApp /></ToastProvider>;
}

function IndexApp() {
  const { show: toast } = useToast();
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
  const [typingUsers, setTypingUsers] = useState<{id: number; display_name: string}[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [msgContextMenu, setMsgContextMenu] = useState<{msg: Message; x: number; y: number} | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<number | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoNoteRecorder, setShowVideoNoteRecorder] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [editingSaving, setEditingSaving] = useState(false);

  // ─── Archive (localStorage) ────────────────────────────────────────────────
  const [archivedChats, setArchivedChats] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("wc_archived_chats") || "[]"); } catch { return []; }
  });
  const [archivedChannels, setArchivedChannels] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("wc_archived_channels") || "[]"); } catch { return []; }
  });
  const [archivedBots, setArchivedBots] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wc_archived_bots") || "[]"); } catch { return []; }
  });
  const [showArchiveChats, setShowArchiveChats] = useState(false);
  const [showArchiveChannels, setShowArchiveChannels] = useState(false);
  const [showArchiveBots, setShowArchiveBots] = useState(false);

  const toggleArchiveChat = (chatId: number) => {
    setArchivedChats(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem("wc_archived_chats", JSON.stringify(next));
      return next;
    });
  };
  const toggleArchiveChannel = (channelId: number) => {
    setArchivedChannels(prev => {
      const next = prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId];
      localStorage.setItem("wc_archived_channels", JSON.stringify(next));
      return next;
    });
  };
  const toggleArchiveBot = (botId: string) => {
    setArchivedBots(prev => {
      const next = prev.includes(botId) ? prev.filter(id => id !== botId) : [...prev, botId];
      localStorage.setItem("wc_archived_bots", JSON.stringify(next));
      return next;
    });
  };

  // Контекстное меню чата (правый клик / долгое нажатие)
  const [chatContextMenu, setChatContextMenu] = useState<{chatId: number; x: number; y: number} | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botEndRef = useRef<HTMLDivElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef<number>(0);

  useEffect(() => { applyTheme(settings); }, [settings]);

  const updateSettings = useCallback((s: AppSettings) => {
    setSettings(s); localStorage.setItem("wc_settings", JSON.stringify(s)); applyTheme(s);
  }, []);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("wc_token") || "";
    if (!token) { setAuthChecked(true); return; }
    apiFetch(AUTH_URL).then(({ ok, data }) => {
      if (ok) { setUser(data.user); requestNotificationPermission(); }
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
    chatsPollRef.current = setInterval(loadChats, 8000);
    return () => { if (chatsPollRef.current) clearInterval(chatsPollRef.current); };
  }, [user, loadChats]);

  const loadContacts = useCallback(async () => {
    const { ok, data } = await apiFetch(`${CHATS_URL}?action=contacts`);
    if (ok) setContacts(data.contacts || []);
  }, []);

  useEffect(() => {
    if (user && (section === "contacts" || section === "search")) loadContacts();
  }, [user, section, loadContacts]);

  const activeChatRef = useRef<typeof activeChat>(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  const settingsRef = useRef<typeof settings>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const loadMessages = useCallback(async (chatId: number, afterId?: number) => {
    const url = afterId
      ? `${MESSAGES_URL}?chat_id=${chatId}&after=${afterId}`
      : `${MESSAGES_URL}?chat_id=${chatId}`;
    const { ok, data } = await apiFetch(url);
    if (!ok) return;
    const newMsgs: Message[] = data.messages || [];
    if (afterId) {
      if (newMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = newMsgs.filter(m => !existingIds.has(m.id));
          if (fresh.length > 0) {
            const incomingFromOther = fresh.filter(m => !m.out);
            if (incomingFromOther.length > 0) {
              const s = settingsRef.current;
              const chat = activeChatRef.current;
              // Sound notification
              if (s?.notifSound) {
                try {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain); gain.connect(ctx.destination);
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(880, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
                  gain.gain.setValueAtTime(0.15, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                  osc.start(); osc.stop(ctx.currentTime + 0.25);
                } catch { /* ignore */ }
              }
              // Browser push notification
              if (s?.notifications) {
                const sender = chat?.partner?.display_name || "Новое сообщение";
                const lastMsg = incomingFromOther[incomingFromOther.length - 1];
                const preview = s.notifPreview
                  ? (lastMsg.msg_type !== "text" ? "📎 Вложение" : (lastMsg.text.slice(0, 80) || "Сообщение"))
                  : "Новое сообщение";
                if (document.hidden) {
                  showBrowserNotification(sender, preview, chat?.partner?.avatar_url);
                }
              }
            }
            return [...prev, ...fresh];
          }
          return prev;
        });
        lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
      }
    } else {
      setMessages(newMsgs);
      lastMsgIdRef.current = newMsgs.length > 0 ? newMsgs[newMsgs.length - 1].id : 0;
    }
  }, []);

  const pollTyping = useCallback(async (chatId: number) => {
    const { ok, data } = await apiFetch(`${MESSAGES_URL}?action=typing&chat_id=${chatId}`);
    if (ok) setTypingUsers(data.typing || []);
  }, []);

  const sendTyping = useCallback(async (chatId: number) => {
    await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify({ action: "typing", chat_id: chatId }) });
  }, []);

  useEffect(() => {
    if (!activeChat) { setTypingUsers([]); return; }
    lastMsgIdRef.current = 0;
    setMsgsLoading(true);
    loadMessages(activeChat.chat_id).finally(() => setMsgsLoading(false));
    const chatId = activeChat.chat_id;
    const pollInterval = setInterval(async () => {
      await loadMessages(chatId, lastMsgIdRef.current || undefined);
      await pollTyping(chatId);
    }, 2000);
    return () => {
      clearInterval(pollInterval);
      setTypingUsers([]);
    };
  }, [activeChat?.chat_id]);

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
  const incomingCallRef = useRef<CallSession | null>(null);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => {
    if (!user || !CALLS_URL) return;
    callPollRef.current = setInterval(async () => {
      if (activeCall) return;
      const { ok, data } = await apiFetch(`${CALLS_URL}?action=incoming`);
      if (ok && data.call) {
        const call: CallSession = data.call;
        if (!incomingCallRef.current || incomingCallRef.current.room_id !== call.room_id) {
          setIncomingCall(call);
          if (settingsRef.current?.notifications) {
            showBrowserNotification(
              call.call_type === "video" ? "Входящий видеозвонок" : "Входящий звонок",
              `${call.caller.display_name} вызывает вас`,
              call.caller.avatar_url
            );
          }
        }
      } else if (ok && !data.call) {
        setIncomingCall(null);
      }
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

  const t = useT(settings.language);

  const logout = async () => {
    await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "logout" }) });
    localStorage.removeItem("wc_token");
    setUser(null); setChats([]); setContacts([]); setActiveChat(null); setMessages([]);
    toast("Вы вышли из аккаунта", "info");
  };

  const updateProfile = async (display_name: string, username: string): Promise<string | null> => {
    const { ok, data } = await apiFetch(AUTH_URL, {
      method: "POST",
      body: JSON.stringify({ action: "update_profile", display_name, username }),
    });
    if (ok) { setUser(data.user); toast("Профиль обновлён", "success"); return null; }
    return data.error || "Ошибка сохранения";
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

  const searchPeopleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchPeople = useCallback((query: string) => {
    if (searchPeopleRef.current) clearTimeout(searchPeopleRef.current);
    if (!query.trim()) { setPeopleResults([]); setPeopleLoading(false); return; }
    setPeopleLoading(true);
    searchPeopleRef.current = setTimeout(async () => {
      const { ok, data } = await apiFetch(`${CHATS_URL}?action=search_users&q=${encodeURIComponent(query.trim())}`);
      if (ok) setPeopleResults(data.users || []);
      else setPeopleResults([]);
      setPeopleLoading(false);
    }, 400);
  }, []);

  const loadChannels = useCallback(async (tab: "all" | "my" = "all") => {
    if (!CHANNELS_URL) return;
    setChannelsLoading(true);
    const action = tab === "my" ? "my" : "list";
    const { ok, data } = await apiFetch(`${CHANNELS_URL}?action=${action}`);
    if (ok) setChannels(data.channels || []);
    setChannelsLoading(false);
  }, []);

  useEffect(() => {
    if (user && section === "channels") loadChannels(channelTab as "all" | "my");
  }, [user, section, channelTab, loadChannels]);

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
      toast(data.subscribed ? `Подписка на «${ch.name}»` : `Отписка от «${ch.name}»`, "success");
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

  const createChannel = async (name: string, description: string, isPublic: boolean, category?: string, username?: string) => {
    if (!name.trim() || !CHANNELS_URL) return;
    const { ok, data } = await apiFetch(CHANNELS_URL, {
      method: "POST", body: JSON.stringify({ action: "create", name, description, is_public: isPublic, category: category || "general", slug: username || undefined }),
    });
    if (ok) {
      setShowCreateChannel(false);
      setChannels(prev => [data.channel, ...prev]);
      openChannel(data.channel);
      toast(`Канал «${name}» создан`, "success");
    } else {
      toast(data?.error || "Ошибка создания канала", "error");
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
      toast("Канал обновлён", "success");
    } else if (!ok) {
      toast("Ошибка обновления канала", "error");
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
      toast("Канал удалён", "success");
    } else {
      toast("Ошибка удаления канала", "error");
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
      toast("Подписка активирована!", "success");
    } else {
      toast("Ошибка оплаты", "error");
    }
    setPaymentLoading(false);
  };

  const sendMessage = async (overrides?: Partial<Message>) => {
    if (!activeChat || sending) return;
    const text = input.trim();
    if (!overrides && !text) return;
    const replyId = replyTo?.id;
    setInput(""); setReplyTo(null); setShowAttach(false); setSending(true);

    // Оптимистичное добавление сообщения
    const optimisticId = -(Date.now());
    const optimistic: Message = {
      id: optimisticId, sender_id: user!.id, text,
      status: "sent", time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      out: true, msg_type: "text", reactions: [],
      ...(replyId ? { reply_to_id: replyId } : {}),
      ...(overrides || {}),
    };
    setMessages(prev => [...prev, optimistic]);

    const payload: Record<string, unknown> = {
      action: "send", chat_id: activeChat.chat_id, msg_type: "text", text,
      ...(replyId ? { reply_to_id: replyId } : {}),
      ...(overrides || {}),
    };
    let ok = false, data: Record<string, unknown> = {};
    try {
      const res = await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify(payload) });
      ok = res.ok; data = res.data;
    } catch {
      toast("Нет соединения с сервером", "error");
    }

    if (ok && data.message) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...(data.message as Message), out: true } : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      if (!ok) toast(String(data?.error || "Ошибка отправки"), "error");
    }

    loadChats();
    setSending(false);
  };

  const handleFileUpload = async (file: File, msgType: string) => {
    if (!activeChat) return;
    setShowAttach(false); setUploadingMedia(true);
    // Для всех типов кроме avatar используем тип "media" на бэкенде
    // msg_type на фронте (image/video/audio/document) ≠ upload_type на бэкенде
    const uploadType = "media";
    const mime = file.type || "application/octet-stream";
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type: uploadType, mime, data: b64, name: file.name }),
    });
    if (ok) {
      await sendMessage({ msg_type: msgType, media_url: data.url, media_name: file.name, media_size: file.size, text: "" });
    } else {
      toast(`Ошибка загрузки: ${data?.error || "неподдерживаемый формат"}`, "error");
    }
    setUploadingMedia(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    const b64 = await fileToBase64(file);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST", body: JSON.stringify({ type: "avatar", mime: file.type, data: b64, name: file.name }),
    });
    if (ok && user) { setUser({ ...user, avatar_url: data.url }); toast("Аватар обновлён", "success"); }
    else if (!ok) toast("Ошибка загрузки аватара", "error");
    setAvatarUploading(false);
  };

  const sendGeo = () => {
    if (!activeChat) return;
    toast("Получаю геолокацию...", "info");
    navigator.geolocation.getCurrentPosition(
      pos => sendMessage({ msg_type: "geo", geo_lat: pos.coords.latitude, geo_lon: pos.coords.longitude, text: "" }),
      () => toast("Нет доступа к геолокации", "error"),
    );
  };

  const deleteChat = async () => {
    if (!activeChat) return;
    setDeletingChat(true); setChatMenuOpen(false);
    const { ok } = await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify({ action: "delete_chat", chat_id: activeChat.chat_id }) });
    setMessages([]); setChats(p => p.filter(c => c.chat_id !== activeChat.chat_id));
    setActiveChat(null); setMobileView("list"); setDeletingChat(false);
    if (ok) toast("Чат удалён", "success"); else toast("Ошибка удаления чата", "error");
  };

  const clearChat = async () => {
    if (!activeChat) return;
    setChatMenuOpen(false);
    const { ok } = await apiFetch(MESSAGES_URL, { method: "POST", body: JSON.stringify({ action: "clear_chat", chat_id: activeChat.chat_id }) });
    setMessages([]); loadChats();
    if (ok) toast("История очищена", "success"); else toast("Ошибка очистки", "error");
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

  const editMessage = async (msgId: number, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed || editingSaving) return;
    setEditingSaving(true);
    const { ok, data } = await apiFetch(MESSAGES_URL, {
      method: "POST", body: JSON.stringify({ action: "edit", message_id: msgId, text: trimmed }),
    });
    setEditingSaving(false);
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: data.text as string, edited_at: data.edited_at as string } : m));
      setEditingMessage(null); setEditInput("");
      toast("Сообщение изменено", "success");
    } else {
      toast((data?.error as string) || "Ошибка редактирования", "error");
    }
  };

  const removeMessage = async (msgId: number) => {
    setConfirmDeleteMsgId(null);
    setMsgContextMenu(null);
    const { ok } = await apiFetch(MESSAGES_URL, {
      method: "POST", body: JSON.stringify({ action: "remove", message_id: msgId }),
    });
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_removed: true, text: "" } : m));
      toast("Сообщение удалено", "info");
    } else {
      toast("Ошибка удаления", "error");
    }
  };

  const reactToMessage = async (msgId: number, emoji: string) => {
    // Оптимистичное обновление
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = (m.reactions || []).filter(r => r.emoji && r.emoji !== "");
      const myReaction = existing.find(r => r.user_id === user!.id);
      if (myReaction) {
        if (myReaction.emoji === emoji) {
          // Снять реакцию
          return { ...m, reactions: existing.filter(r => r.user_id !== user!.id) };
        } else {
          // Сменить реакцию
          return { ...m, reactions: [...existing.filter(r => r.user_id !== user!.id), { emoji, user_id: user!.id, display_name: user!.display_name }] };
        }
      }
      return { ...m, reactions: [...existing, { emoji, user_id: user!.id, display_name: user!.display_name }] };
    }));
    setMsgContextMenu(null);
    const { ok } = await apiFetch(MESSAGES_URL, {
      method: "POST", body: JSON.stringify({ action: "react", message_id: msgId, emoji }),
    });
    if (!ok) {
      // Откат при ошибке
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const existing = (m.reactions || []).filter(r => r.emoji && r.emoji !== "");
        const myReaction = existing.find(r => r.user_id === user!.id);
        if (myReaction?.emoji === emoji) return { ...m, reactions: existing.filter(r => r.user_id !== user!.id) };
        return { ...m, reactions: [...existing.filter(r => r.user_id !== user!.id)] };
      }));
      toast("Ошибка реакции", "error");
    }
  };

  const forwardMessage = async (msgId: number) => {
    if (!activeChat) return;
    setMsgContextMenu(null);
    const { ok, data } = await apiFetch(MESSAGES_URL, {
      method: "POST", body: JSON.stringify({ action: "forward", message_id: msgId, chat_id: activeChat.chat_id }),
    });
    if (ok && data.message) {
      setMessages(prev => [...prev, { ...(data.message as Message), out: true }]);
      loadChats();
      toast("Сообщение переслано", "success");
    } else {
      toast((data?.error as string) || "Ошибка пересылки", "error");
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });

  // Нормализует mime: убирает codecs-суффикс, выбирает разумный fallback
  const normalizeMime = (raw: string, fallback: string) => {
    if (!raw) return fallback;
    const base = raw.split(";")[0].trim().toLowerCase();
    return base || fallback;
  };

  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!activeChat) return;
    setShowVoiceRecorder(false);
    setUploadingMedia(true);
    toast("Отправляю голосовое...", "info");
    const mime = normalizeMime(blob.type, "audio/webm");
    const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "webm";
    const b64 = await blobToBase64(blob);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type: "voice", mime, data: b64, name: `voice_${Date.now()}.${ext}` }),
    });
    if (ok) {
      await sendMessage({
        msg_type: "voice", media_url: data.url, media_name: "Голосовое", media_size: blob.size, text: "",
        ...({ media_duration: duration } as unknown as Partial<Message>),
      });
    } else {
      toast(`Ошибка отправки: ${data?.error || "сервер недоступен"}`, "error");
    }
    setUploadingMedia(false);
  };

  const sendVideoNote = async (blob: Blob, duration: number) => {
    if (!activeChat) return;
    setShowVideoNoteRecorder(false);
    setUploadingMedia(true);
    toast("Отправляю видеосообщение...", "info");
    const mime = normalizeMime(blob.type, "video/webm");
    const b64 = await blobToBase64(blob);
    const { ok, data } = await apiFetch(UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ type: "video_note", mime, data: b64, name: `videonote_${Date.now()}.webm` }),
    });
    if (ok) {
      await sendMessage({
        msg_type: "video_note", media_url: data.url, text: "",
        ...({ media_duration: duration } as unknown as Partial<Message>),
      });
    } else {
      toast(`Ошибка отправки: ${data?.error || "сервер недоступен"}`, "error");
    }
    setUploadingMedia(false);
  };

  const paySubscription = (plan: string) => {
    setPaymentPlan(plan);
    setPaymentPeriod("month");
    setPaymentStep("select");
    setShowPayment(true);
  };

  const startCall = async (partner: User, type: "audio" | "video") => {
    if (!CALLS_URL) return;
    toast(`Звоним ${partner.display_name}...`, "info");
    const { ok, data } = await apiFetch(CALLS_URL, {
      method: "POST", body: JSON.stringify({ action: "initiate", callee_id: partner.id, call_type: type }),
    });
    if (ok) setActiveCall({ partner, type, roomId: data.room_id, isCallee: false });
    else toast("Не удалось начать звонок", "error");
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
    toast("Звонок отклонён", "info");
  };

  // Document title with unread badge
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) WorChat` : "WorChat";
  }, [totalUnread]);

  const filteredChats = chats.filter(c => c.partner.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredContacts = contacts.filter(c =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
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
  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); requestNotificationPermission(); toast(`Добро пожаловать, ${u.display_name}!`, "success"); }} />;

  const navItems: { id: Section; icon: string; label: string }[] = [
    { id: "chats", icon: "MessageSquare", label: t("chats") },
    { id: "channels", icon: "Rss", label: t("channels") },
    { id: "bots", icon: "Bot", label: t("bots") },
    { id: "calls", icon: "Phone", label: t("calls") },
    { id: "contacts", icon: "Users", label: t("contacts") },
    { id: "settings", icon: "Settings", label: t("settings") },
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

      {/* Voice recorder */}
      {showVoiceRecorder && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2">
          <VoiceRecorder onSend={sendVoiceMessage} onCancel={() => setShowVoiceRecorder(false)} />
        </div>
      )}

      {/* Video note recorder */}
      {showVideoNoteRecorder && (
        <VideoNoteRecorder onSend={sendVideoNote} onCancel={() => setShowVideoNoteRecorder(false)} />
      )}

      {/* User profile modal */}
      {viewingProfile && (
        <UserProfileModal
          user={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onStartChat={() => { startChatWithContact(viewingProfile); setViewingProfile(null); }}
          onCall={(type) => { startCall(viewingProfile, type); setViewingProfile(null); }}
        />
      )}

      {/* Photo viewer */}
      {viewingPhoto && <PhotoViewer url={viewingPhoto} onClose={() => setViewingPhoto(null)} />}

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
                placeholder={chatSearchTab === "chats" ? t("search_chats") : t("search_people")}
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
              {([["chats", t("chats")], ["people", t("people")]] as [ChatSearchTab, string][]).map(([id, label]) => (
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
              avatarInputRef={avatarInputRef as React.RefObject<HTMLInputElement>}
              onUpdateProfile={updateProfile} />
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
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                  {subscription && <Badge plan={(subscription.plan as "standard" | "premium") || "standard"} size="lg" />}
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                {[
                  { icon: "User", label: t("name"), value: user.display_name },
                  { icon: "AtSign", label: t("username"), value: `@${user.username}` },
                  { icon: "Shield", label: t("encryption"), value: "AES-512 E2E" },
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
              <button onClick={() => setSection("settings")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors">
                <Icon name="Pencil" size={15} />{t("edit_profile")}
              </button>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 text-destructive text-sm font-medium">
                <Icon name="LogOut" size={16} />{t("logout")}
              </button>
            </div>
          )}

          {/* Chat context menu */}
          {chatContextMenu && (
            <div className="fixed inset-0 z-50" onClick={() => setChatContextMenu(null)}>
              <div className="absolute bg-card border border-border rounded-2xl shadow-xl py-1 min-w-[160px]"
                style={{ top: Math.min(chatContextMenu.y, window.innerHeight - 120), left: Math.max(4, Math.min(chatContextMenu.x, window.innerWidth - 168)) }}
                onClick={e => e.stopPropagation()}>
                <button onClick={() => { toggleArchiveChat(chatContextMenu.chatId); setChatContextMenu(null); toast(archivedChats.includes(chatContextMenu.chatId) ? "Чат разархивирован" : "Чат архивирован", "success"); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                  <Icon name={archivedChats.includes(chatContextMenu.chatId) ? "ArchiveRestore" : "Archive"} size={14} className="text-muted-foreground" />
                  {archivedChats.includes(chatContextMenu.chatId) ? "Разархивировать" : "Архивировать"}
                </button>
              </div>
            </div>
          )}

          {/* CHATS */}
          {section === "chats" && chatSearchTab === "chats" && (() => {
            const visibleChats = showArchiveChats
              ? filteredChats.filter(c => archivedChats.includes(c.chat_id))
              : filteredChats.filter(c => !archivedChats.includes(c.chat_id));
            const archivedCount = chats.filter(c => archivedChats.includes(c.chat_id)).length;

            return (
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

                {/* Archive toggle banner */}
                {!searchQuery && archivedCount > 0 && !showArchiveChats && (
                  <button onClick={() => setShowArchiveChats(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon name="Archive" size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Архив</span>
                      <div className="text-xs text-muted-foreground">{archivedCount} {archivedCount === 1 ? "чат" : archivedCount < 5 ? "чата" : "чатов"}</div>
                    </div>
                    <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                  </button>
                )}

                {/* Back from archive */}
                {showArchiveChats && (
                  <button onClick={() => setShowArchiveChats(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-border/50 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
                    <Icon name="ArrowLeft" size={14} />Назад к чатам
                  </button>
                )}

                {searchQuery && visibleChats.length === 0 && chats.length > 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">Чаты не найдены</div>
                )}
                {!searchQuery && !showArchiveChats && visibleChats.length === 0 && chats.length === archivedCount && chats.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground text-center px-4">
                    <Icon name="ArchiveRestore" size={32} className="opacity-20" />
                    <p className="text-sm">Все чаты в архиве</p>
                  </div>
                )}

                {visibleChats.map((c, i) => (
                  <button key={c.chat_id} onClick={() => openChat(c)}
                    onContextMenu={e => { e.preventDefault(); setChatContextMenu({ chatId: c.chat_id, x: e.clientX, y: e.clientY }); }}
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
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {showArchiveChats && <Icon name="Archive" size={10} className="text-muted-foreground" />}
                          {c.unread > 0 && !showArchiveChats && (
                            <span className="min-w-5 h-5 px-1.5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* PEOPLE SEARCH */}
          {section === "chats" && chatSearchTab === "people" && (
            <div className="px-4 py-2">
              {!searchQuery && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-center">
                  <Icon name="UserSearch" size={36} className="opacity-20" />
                  <p className="text-sm">{t("search_people")}</p>
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
                <button key={u.id} onClick={() => setViewingProfile(u)}
                  className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted/60 rounded-xl transition-colors text-left">
                  <Avatar user={u} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                  <Icon name="User" size={16} className="text-muted-foreground shrink-0" />
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
                      <div key={c.id} className={`flex items-center gap-3 py-2.5 px-2 ${st === "offline" ? "opacity-55" : ""}`}>
                        <button onClick={() => setViewingProfile(c)} className="shrink-0">
                          <Avatar user={c} size={40} />
                        </button>
                        <button onClick={() => setViewingProfile(c)} className="flex-1 min-w-0 text-left hover:bg-muted/60 rounded-xl px-2 py-1 -mx-2 -my-1 transition-colors">
                          <div className="text-sm font-medium">{c.display_name}</div>
                          <div className="text-xs text-muted-foreground">@{c.username}</div>
                        </button>
                        <button onClick={() => startChatWithContact(c)}
                          className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors shrink-0">
                          <Icon name="MessageCircle" size={15} className="text-muted-foreground" />
                        </button>
                      </div>
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
          {section === "channels" && (() => {
            const baseList = channelTab === "search" ? channelSearchResults : channels;
            const visibleChannels = showArchiveChannels
              ? baseList.filter(ch => archivedChannels.includes(ch.id))
              : baseList.filter(ch => !archivedChannels.includes(ch.id));
            const archivedChannelCount = channels.filter(ch => archivedChannels.includes(ch.id)).length;
            return (
              <div>
                {/* Tabs */}
                <div className="flex gap-1 px-4 py-2 border-b border-border">
                  {([["all","Все"],["my","Мои"],["search","Поиск"]] as [string,string][]).map(([id,label]) => (
                    <button key={id} onClick={() => { setChannelTab(id as "all"|"my"|"search"); setChannelSearchQuery(""); setChannelSearchResults([]); setShowArchiveChannels(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${channelTab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                      {label}
                    </button>
                  ))}
                </div>

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

                <div>
                  {channelsLoading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
                  {channelSearchLoading && channelTab === "search" && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}

                  {/* Archive banner for channels */}
                  {channelTab !== "search" && archivedChannelCount > 0 && !showArchiveChannels && (
                    <button onClick={() => setShowArchiveChannels(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50">
                      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon name="Archive" size={20} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Архив каналов</span>
                        <div className="text-xs text-muted-foreground">{archivedChannelCount} {archivedChannelCount === 1 ? "канал" : archivedChannelCount < 5 ? "канала" : "каналов"}</div>
                      </div>
                      <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                    </button>
                  )}
                  {showArchiveChannels && (
                    <button onClick={() => setShowArchiveChannels(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-border/50 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
                      <Icon name="ArrowLeft" size={14} />Назад к каналам
                    </button>
                  )}

                  {(() => {
                    if (!channelsLoading && !channelSearchLoading && visibleChannels.length === 0 && channelTab !== "search") {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-center px-4">
                          <Icon name={showArchiveChannels ? "Archive" : "Rss"} size={36} className="opacity-20" />
                          <p className="text-sm">{showArchiveChannels ? "Архив пуст" : channelTab === "my" ? "У вас нет каналов" : "Каналов пока нет"}</p>
                        </div>
                      );
                    }
                    if (channelTab === "search" && channelSearchQuery && !channelSearchLoading && visibleChannels.length === 0) {
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
                    return visibleChannels.map((ch, i) => (
                      <button key={ch.id} onClick={() => openChannel(ch)}
                        onContextMenu={e => { e.preventDefault(); toggleArchiveChannel(ch.id); toast(archivedChannels.includes(ch.id) ? "Канал разархивирован" : "Канал архивирован", "success"); }}
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {showArchiveChannels && <Icon name="Archive" size={11} className="text-muted-foreground" />}
                          <span className="text-xs text-muted-foreground">{ch.members_count >= 1000 ? `${(ch.members_count/1000).toFixed(1)}K` : ch.members_count}</span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>

                {!showArchiveChannels && (
                  <div className="px-4 py-3 border-t border-border mt-2">
                    <button onClick={() => setShowCreateChannel(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:bg-muted/60 transition-colors text-muted-foreground text-sm">
                      <Icon name="Plus" size={16} />Создать канал
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* BOTS list */}
          {section === "bots" && !activeBotId && (() => {
            const isBotArchived = archivedBots.includes("worchat_bot");
            return (
              <div className="px-4 py-2 space-y-1">
                {/* Archive banner */}
                {isBotArchived && !showArchiveBots && (
                  <button onClick={() => setShowArchiveBots(true)}
                    className="w-full flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors text-left">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon name="Archive" size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Архив ботов</span>
                      <div className="text-xs text-muted-foreground">1 бот</div>
                    </div>
                    <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                  </button>
                )}
                {showArchiveBots && (
                  <button onClick={() => setShowArchiveBots(false)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-primary text-sm font-medium hover:bg-primary/10 rounded-xl transition-colors">
                    <Icon name="ArrowLeft" size={14} />Назад к ботам
                  </button>
                )}

                {/* Bot item — показываем в зависимости от режима архива */}
                {((showArchiveBots && isBotArchived) || (!showArchiveBots && !isBotArchived)) && (
                  <div className="flex items-center gap-3 py-3 hover:bg-muted/60 rounded-xl px-2 transition-colors group">
                    <button onClick={() => setActiveBotId("worchat_bot")} className="flex items-center gap-3 flex-1 text-left min-w-0">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 relative"
                        style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                        <Icon name="Bot" size={22} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">WorChat Bot</span>
                          <Badge plan="premium" />
                          {isBotArchived && <Icon name="Archive" size={11} className="text-muted-foreground" />}
                        </div>
                        <div className="text-xs text-muted-foreground">Подписки · Помощь · Поддержка</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { toggleArchiveBot("worchat_bot"); setShowArchiveBots(false); toast(isBotArchived ? "Бот разархивирован" : "Бот архивирован", "success"); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title={isBotArchived ? "Разархивировать" : "Архивировать"}>
                      <Icon name={isBotArchived ? "ArchiveRestore" : "Archive"} size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                )}

                {!isBotArchived && !showArchiveBots && (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-1">
                    <Icon name="MousePointerClick" size={12} />
                    <span>Долгое нажатие или ПКМ для архивирования</span>
                  </div>
                )}
              </div>
            );
          })()}
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
                <button onClick={() => { toggleArchiveChannel(activeChannel.id); toast(archivedChannels.includes(activeChannel.id) ? "Канал разархивирован" : "Канал архивирован", "success"); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors" title={archivedChannels.includes(activeChannel.id) ? "Разархивировать" : "Архивировать"}>
                  <Icon name={archivedChannels.includes(activeChannel.id) ? "ArchiveRestore" : "Archive"} size={16} className="text-muted-foreground" />
                </button>
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
                <Icon name="Bot" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">WorChat Bot</span>
                  <Badge plan="premium" />
                </div>
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
              <button onClick={() => { setMobileView("list"); setMsgContextMenu(null); }}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
              </button>
              <button onClick={() => setViewingProfile(activeChat.partner)}>
                <Avatar user={activeChat.partner} size={36} />
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingProfile(activeChat.partner)}>
                <div className="text-sm font-semibold truncate">{activeChat.partner.display_name}</div>
                <div className={`text-xs transition-all ${typingUsers.length > 0 ? "text-primary" : activeChat.partner.status === "online" ? "text-green-500" : "text-muted-foreground"}`}>
                  {typingUsers.length > 0 ? "печатает..." : activeChat.partner.status === "online" ? "В сети" : "Не в сети"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => CALLS_URL && startCall(activeChat.partner, "audio")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Аудиозвонок">
                  <Icon name="Phone" size={17} className="text-muted-foreground" />
                </button>
                <button onClick={() => CALLS_URL && startCall(activeChat.partner, "video")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Видеозвонок">
                  <Icon name="Video" size={17} className="text-muted-foreground" />
                </button>
                <div className="relative">
                  <button onClick={() => setChatMenuOpen(!chatMenuOpen)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                    <Icon name="MoreVertical" size={17} className="text-muted-foreground" />
                  </button>
                  {chatMenuOpen && (
                    <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-2xl shadow-lg z-50 py-1 animate-pop">
                      <button onClick={() => { toggleArchiveChat(activeChat.chat_id); setChatMenuOpen(false); toast(archivedChats.includes(activeChat.chat_id) ? "Чат разархивирован" : "Чат архивирован", "success"); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <Icon name={archivedChats.includes(activeChat.chat_id) ? "ArchiveRestore" : "Archive"} size={15} className="text-muted-foreground" />
                        {archivedChats.includes(activeChat.chat_id) ? "Разархивировать" : "Архивировать чат"}
                      </button>
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
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-50 border border-green-100 dark:bg-green-950/30 dark:border-green-900/50">
                <Icon name="Lock" size={10} className="text-green-500" />
                <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">Сквозное шифрование · WorChat</span>
              </div>
            </div>

            {/* Context menu overlay */}
            {msgContextMenu && (
              <div className="fixed inset-0 z-50" onClick={() => { setMsgContextMenu(null); setConfirmDeleteMsgId(null); }}>
                <div className="absolute bg-card border border-border rounded-2xl shadow-xl py-1 min-w-[188px] z-50"
                  style={{
                    top: Math.min(msgContextMenu.y, window.innerHeight - 280),
                    left: Math.max(4, Math.min(msgContextMenu.x, window.innerWidth - 196)),
                  }}
                  onClick={e => e.stopPropagation()}>
                  {/* Quick reactions */}
                  <div className="flex items-center justify-between px-2.5 py-2 border-b border-border">
                    {["👍","❤️","😂","😮","😢","🔥"].map(emoji => {
                      const hasMyReaction = msgContextMenu.msg.reactions?.find(r => r.user_id === user?.id && r.emoji === emoji);
                      return (
                        <button key={emoji} onClick={() => reactToMessage(msgContextMenu.msg.id, emoji)}
                          className={`text-lg hover:scale-125 transition-transform rounded-lg p-0.5 ${hasMyReaction ? "bg-primary/15 scale-110" : ""}`}>
                          {emoji}
                        </button>
                      );
                    })}
                  </div>

                  {/* Ответить */}
                  {!msgContextMenu.msg.is_removed && (
                    <button onClick={() => { setReplyTo(msgContextMenu.msg); setMsgContextMenu(null); setConfirmDeleteMsgId(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                      <Icon name="Reply" size={14} className="text-muted-foreground" />Ответить
                    </button>
                  )}

                  {/* Переслать */}
                  {!msgContextMenu.msg.is_removed && (
                    <button onClick={() => forwardMessage(msgContextMenu.msg.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                      <Icon name="Forward" size={14} className="text-muted-foreground" />Переслать
                    </button>
                  )}

                  {/* Редактировать (только своё текстовое) */}
                  {msgContextMenu.msg.out && !msgContextMenu.msg.is_removed && msgContextMenu.msg.msg_type === "text" && (
                    <button onClick={() => { setEditingMessage(msgContextMenu.msg); setEditInput(msgContextMenu.msg.text); setMsgContextMenu(null); setConfirmDeleteMsgId(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                      <Icon name="Pencil" size={14} className="text-muted-foreground" />Редактировать
                    </button>
                  )}

                  {/* Копировать */}
                  {!msgContextMenu.msg.is_removed && msgContextMenu.msg.text && (
                    <button onClick={() => { navigator.clipboard.writeText(msgContextMenu.msg.text); setMsgContextMenu(null); setConfirmDeleteMsgId(null); toast("Скопировано", "success"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors">
                      <Icon name="Copy" size={14} className="text-muted-foreground" />Копировать
                    </button>
                  )}

                  {/* Удалить с подтверждением */}
                  {msgContextMenu.msg.out && !msgContextMenu.msg.is_removed && (
                    confirmDeleteMsgId === msgContextMenu.msg.id ? (
                      <div className="px-3 py-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Удалить сообщение?</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => setConfirmDeleteMsgId(null)}
                            className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">
                            Нет
                          </button>
                          <button onClick={() => removeMessage(msgContextMenu.msg.id)}
                            className="flex-1 py-1.5 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors font-medium">
                            Удалить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteMsgId(msgContextMenu.msg.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive text-left transition-colors border-t border-border">
                        <Icon name="Trash2" size={14} />Удалить
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto px-4 py-2 space-y-0.5 ${chatBgClass}`}
              onClick={() => { setMsgContextMenu(null); setChatMenuOpen(false); }}>
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
              {messages.map((msg, i) => {
                const showDate = i === 0 || messages[i-1]?.time?.slice(0,2) !== msg.time?.slice(0,2);
                const isRemoved = msg.is_removed;
                return (
                  <div key={msg.id}>
                    <div className={`flex ${msg.out ? "justify-end" : "justify-start"} group`}
                      onContextMenu={e => { e.preventDefault(); setMsgContextMenu({ msg, x: e.clientX, y: e.clientY }); }}>
                      <div className="relative max-w-xs lg:max-w-md">
                        <div className={`px-3.5 py-2 rounded-2xl cursor-pointer
                          ${msg.out ? "msg-out rounded-br-sm" : "msg-in rounded-bl-sm shadow-sm border border-border"}
                          ${isRemoved ? "opacity-50 italic" : ""}`}
                          onClick={e => {
                            if (window.getSelection()?.toString()) return;
                            if (msg.msg_type === "image" && msg.media_url) { setViewingPhoto(msg.media_url); return; }
                            setMsgContextMenu({ msg, x: e.clientX, y: e.clientY });
                          }}>
                          {isRemoved ? (
                            <p className="text-sm text-muted-foreground">Сообщение удалено</p>
                          ) : (
                            <MessageBubble msg={msg} allMessages={messages} onPhotoClick={url => setViewingPhoto(url)} />
                          )}
                          <div className={`flex items-center justify-end gap-1 mt-0.5`}>
                            {msg.edited_at && !isRemoved && (
                              <span className={`text-[9px] ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>ред.</span>
                            )}
                            <span className={`text-[10px] ${msg.out ? "text-white/70" : "text-muted-foreground"}`}>{msg.time}</span>
                            {msg.out && !isRemoved && (
                              <Icon name={msg.status === "read" ? "CheckCheck" : "Check"} size={12}
                                className={msg.status === "read" ? "text-blue-300" : "text-white/60"} />
                            )}
                          </div>
                        </div>

                        {/* Reactions */}
                        {!isRemoved && msg.reactions && msg.reactions.filter(r => r.emoji && r.emoji !== '').length > 0 && (
                          <div className={`flex flex-wrap gap-0.5 mt-0.5 ${msg.out ? "justify-end" : "justify-start"}`}>
                            {(() => {
                              const grouped: Record<string, number> = {};
                              (msg.reactions || []).filter(r => r.emoji).forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
                              return Object.entries(grouped).map(([emoji, count]) => (
                                <button key={emoji}
                                  onClick={() => reactToMessage(msg.id, emoji)}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all
                                    ${msg.reactions?.find(r => r.user_id === user?.id && r.emoji === emoji)
                                      ? "bg-primary/15 border-primary/30 text-primary"
                                      : "bg-card border-border hover:bg-muted"}`}>
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="font-medium">{count}</span>}
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="msg-in px-3.5 py-2 rounded-2xl rounded-bl-sm border border-border shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

            {/* Edit preview */}
            {editingMessage && (
              <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-2 shrink-0">
                <Icon name="Pencil" size={14} className="text-primary shrink-0" />
                <div className="flex-1 border-l-2 border-primary pl-2">
                  <p className="text-xs text-primary font-medium">Редактирование</p>
                  <p className="text-xs text-muted-foreground truncate">{editingMessage.text}</p>
                </div>
                <button onClick={() => { setEditingMessage(null); setEditInput(""); }} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted">
                  <Icon name="X" size={14} className="text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Attachment picker */}
            {showAttach && (
              <div className="px-4 pb-2 bg-card border-t border-border shrink-0">
                <div className="grid grid-cols-4 gap-2 pt-3">
                  <button onClick={() => { fileInputRef.current?.setAttribute("data-type","image"); fileInputRef.current?.setAttribute("accept","image/*"); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Icon name="Image" size={22} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Фото</span>
                  </button>
                  <button onClick={() => { fileInputRef.current?.setAttribute("data-type","video"); fileInputRef.current?.setAttribute("accept","video/*"); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Icon name="Video" size={22} className="text-purple-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Видео</span>
                  </button>
                  <button onClick={() => { setShowAttach(false); setShowVideoNoteRecorder(true); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Icon name="CirclePlay" size={22} className="text-indigo-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Кружок</span>
                  </button>
                  <button onClick={() => { setShowAttach(false); setShowVoiceRecorder(true); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Icon name="Mic" size={22} className="text-red-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Голос</span>
                  </button>
                  <button onClick={() => { fileInputRef.current?.setAttribute("data-type","audio"); fileInputRef.current?.setAttribute("accept","audio/*"); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Icon name="Music" size={22} className="text-orange-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Аудио</span>
                  </button>
                  <button onClick={() => { fileInputRef.current?.setAttribute("data-type","document"); fileInputRef.current?.setAttribute("accept","*/*"); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="FileText" size={22} className="text-green-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Файл</span>
                  </button>
                  <button onClick={sendGeo}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="MapPin" size={22} className="text-green-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Геолокация</span>
                  </button>
                  <button onClick={() => setShowAttach(false)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-muted/60 transition-colors">
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

            {/* Input */}
            <div className="px-3 py-2.5 bg-card border-t border-border shrink-0">
              <div className="flex items-end gap-1.5">
                {!editingMessage && (
                  <>
                    <button onClick={() => setShowAttach(!showAttach)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0
                        ${showAttach ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                      <Icon name="Paperclip" size={18} />
                    </button>
                    <button onClick={() => setShowVideoNoteRecorder(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-all shrink-0" title="Видеокружок">
                      <Icon name="CirclePlay" size={18} />
                    </button>
                  </>
                )}
                <textarea
                  value={editingMessage ? editInput : input}
                  onChange={e => {
                    if (editingMessage) { setEditInput(e.target.value); }
                    else {
                      setInput(e.target.value);
                      if (activeChat && e.target.value) sendTyping(activeChat.chat_id);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (editingMessage) { editMessage(editingMessage.id, editInput); }
                      else sendMessage();
                    }
                    if (e.key === "Escape" && editingMessage) { setEditingMessage(null); setEditInput(""); }
                  }}
                  placeholder={editingMessage ? "Редактировать сообщение..." : "Написать сообщение..."}
                  rows={1}
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-mcalls border-0 outline-none focus:ring-2 focus:ring-primary/30 resize-none max-h-28 transition-all bg-muted"
                  style={{ lineHeight: "1.5" }}
                  autoFocus={!!editingMessage}
                />
                {!editingMessage && !input.trim() ? (
                  <button onClick={() => setShowVoiceRecorder(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shrink-0">
                    <Icon name="Mic" size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => { if (editingMessage) { editMessage(editingMessage.id, editInput); } else sendMessage(); }}
                    disabled={(editingMessage ? (!editInput.trim() || editingSaving) : (!input.trim() || sending))}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0
                      ${(editingMessage ? (editInput.trim() && !editingSaving) : (input.trim() && !sending)) ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground"}`}>
                    {(editingMessage ? editingSaving : sending)
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name={editingMessage ? "Check" : "Send"} size={16} />}
                  </button>
                )}
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