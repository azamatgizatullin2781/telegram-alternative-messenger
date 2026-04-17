// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_initials: string;
  status: string;
  avatar_url?: string;
}
export interface ChatItem {
  chat_id: number;
  partner: User;
  last_text: string;
  last_time: string;
  last_sender_id: number | null;
  unread: number;
}
export interface Message {
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
  edited_at?: string | null;
  is_removed?: boolean;
  reactions?: {emoji: string; user_id: number; display_name: string}[];
  forwarded_from_id?: number | null;
  geo_lat?: number;
  geo_lon?: number;
  contact_name?: string;
  contact_phone?: string;
}
export interface BotMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  extra?: Record<string, unknown>;
  time: string;
}
export interface CallSession {
  id: number;
  room_id: string;
  call_type: "audio" | "video";
  status: string;
  caller: User;
}
export type Theme = "light" | "dark" | "system";
export type Accent = "blue" | "green" | "purple" | "red" | "orange" | "pink";
export type Wallpaper = "plain" | "dots" | "grid" | "bubbles";
export interface AppSettings {
  theme: Theme;
  accent: Accent;
  wallpaper: Wallpaper;
  notifications: boolean;
  notifSound: boolean;
  notifPreview: boolean;
  notifCalls: boolean;
  notifChannels: boolean;
  language: string;
  region: string;
  fontSize: "sm" | "md" | "lg";
  // Privacy
  privacyLastSeen: "all" | "contacts" | "nobody";
  privacyAvatar: "all" | "contacts" | "nobody";
  privacyReadReceipts: boolean;
  privacyTyping: boolean;
  privacyForwards: "all" | "contacts" | "nobody";
  // Storage
  autoDownloadImages: boolean;
  autoDownloadVideos: boolean;
  autoDownloadDocs: boolean;
  saveToGallery: boolean;
}
export interface DeviceInfo {
  name: string;
  os: string;
  browser: string;
  current: boolean;
}
export type Section = "chats" | "channels" | "bots" | "contacts" | "calls" | "settings" | "profile";
export type ChatSearchTab = "chats" | "people";
export interface Channel {
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
export interface ChannelPost {
  id: number;
  text: string;
  msg_type: string;
  media_url?: string;
  media_name?: string;
  views: number;
  ts: string;
  author: { display_name: string; avatar_color: string; avatar_initials: string; avatar_url?: string };
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light", accent: "blue", wallpaper: "plain",
  notifications: true, notifSound: true, notifPreview: true, notifCalls: true, notifChannels: true,
  language: "ru", region: "RU", fontSize: "md",
  privacyLastSeen: "all", privacyAvatar: "all",
  privacyReadReceipts: true, privacyTyping: true, privacyForwards: "all",
  autoDownloadImages: true, autoDownloadVideos: false, autoDownloadDocs: false, saveToGallery: false,
};

// ─── i18n ──────────────────────────────────────────────────────────────────────
export const I18N: Record<string, Record<string, string>> = {
  ru: {
    chats: "Чаты", channels: "Каналы", bots: "Боты", calls: "Звонки",
    contacts: "Контакты", settings: "Настройки", profile: "Профиль",
    search_chats: "Поиск чатов...", search_people: "Поиск по имени или @username...",
    people: "Люди", no_chats: "Нет чатов. Перейдите в «Контакты».",
    find_people: "Найти собеседника", online: "Онлайн", offline: "Не в сети",
    type_message: "Сообщение...", send: "Отправить", logout: "Выйти из аккаунта",
    name: "Имя", username: "Логин", encryption: "Шифрование",
    appearance: "Оформление", notifications_tab: "Уведомления",
    devices: "Устройства", language: "Язык",
    edit_profile: "Редактировать профиль", save: "Сохранить", cancel: "Отмена",
    display_name: "Отображаемое имя", username_hint: "a-z, 0-9 и _ (3–32 символа)",
    profile_saved: "Профиль сохранён!", no_messages: "Нет сообщений",
    deleted_msg: "Сообщение удалено", typing: "печатает...",
    call_history_empty: "История звонков пуста",
  },
  en: {
    chats: "Chats", channels: "Channels", bots: "Bots", calls: "Calls",
    contacts: "Contacts", settings: "Settings", profile: "Profile",
    search_chats: "Search chats...", search_people: "Search by name or @username...",
    people: "People", no_chats: "No chats. Go to Contacts.",
    find_people: "Find someone", online: "Online", offline: "Offline",
    type_message: "Message...", send: "Send", logout: "Log out",
    name: "Name", username: "Username", encryption: "Encryption",
    appearance: "Appearance", notifications_tab: "Notifications",
    devices: "Devices", language: "Language",
    edit_profile: "Edit profile", save: "Save", cancel: "Cancel",
    display_name: "Display name", username_hint: "a-z, 0-9 and _ (3–32 chars)",
    profile_saved: "Profile saved!", no_messages: "No messages",
    deleted_msg: "Message deleted", typing: "typing...",
    call_history_empty: "No call history",
  },
  de: {
    chats: "Chats", channels: "Kanäle", bots: "Bots", calls: "Anrufe",
    contacts: "Kontakte", settings: "Einstellungen", profile: "Profil",
    search_chats: "Chats suchen...", search_people: "Nach Name oder @username suchen...",
    people: "Personen", no_chats: "Keine Chats. Gehe zu Kontakte.",
    find_people: "Jemanden finden", online: "Online", offline: "Offline",
    type_message: "Nachricht...", send: "Senden", logout: "Abmelden",
    name: "Name", username: "Benutzername", encryption: "Verschlüsselung",
    appearance: "Darstellung", notifications_tab: "Benachrichtigungen",
    devices: "Geräte", language: "Sprache",
    edit_profile: "Profil bearbeiten", save: "Speichern", cancel: "Abbrechen",
    display_name: "Anzeigename", username_hint: "a-z, 0-9 und _ (3–32 Zeichen)",
    profile_saved: "Profil gespeichert!", no_messages: "Keine Nachrichten",
    deleted_msg: "Nachricht gelöscht", typing: "tippt...",
    call_history_empty: "Keine Anrufhistorie",
  },
  fr: {
    chats: "Chats", channels: "Chaînes", bots: "Bots", calls: "Appels",
    contacts: "Contacts", settings: "Paramètres", profile: "Profil",
    search_chats: "Rechercher des chats...", search_people: "Rechercher par nom ou @username...",
    people: "Personnes", no_chats: "Aucun chat. Allez aux Contacts.",
    find_people: "Trouver quelqu'un", online: "En ligne", offline: "Hors ligne",
    type_message: "Message...", send: "Envoyer", logout: "Se déconnecter",
    name: "Nom", username: "Identifiant", encryption: "Chiffrement",
    appearance: "Apparence", notifications_tab: "Notifications",
    devices: "Appareils", language: "Langue",
    edit_profile: "Modifier le profil", save: "Enregistrer", cancel: "Annuler",
    display_name: "Nom d'affichage", username_hint: "a-z, 0-9 et _ (3–32 car.)",
    profile_saved: "Profil enregistré!", no_messages: "Aucun message",
    deleted_msg: "Message supprimé", typing: "écrit...",
    call_history_empty: "Aucun historique d'appels",
  },
  es: {
    chats: "Chats", channels: "Canales", bots: "Bots", calls: "Llamadas",
    contacts: "Contactos", settings: "Ajustes", profile: "Perfil",
    search_chats: "Buscar chats...", search_people: "Buscar por nombre o @usuario...",
    people: "Personas", no_chats: "Sin chats. Ve a Contactos.",
    find_people: "Encontrar alguien", online: "En línea", offline: "Desconectado",
    type_message: "Mensaje...", send: "Enviar", logout: "Cerrar sesión",
    name: "Nombre", username: "Usuario", encryption: "Cifrado",
    appearance: "Apariencia", notifications_tab: "Notificaciones",
    devices: "Dispositivos", language: "Idioma",
    edit_profile: "Editar perfil", save: "Guardar", cancel: "Cancelar",
    display_name: "Nombre visible", username_hint: "a-z, 0-9 y _ (3–32 chars)",
    profile_saved: "¡Perfil guardado!", no_messages: "Sin mensajes",
    deleted_msg: "Mensaje eliminado", typing: "escribiendo...",
    call_history_empty: "Sin historial de llamadas",
  },
  tr: {
    chats: "Sohbetler", channels: "Kanallar", bots: "Botlar", calls: "Aramalar",
    contacts: "Kişiler", settings: "Ayarlar", profile: "Profil",
    search_chats: "Sohbet ara...", search_people: "İsim veya @kullanıcı ara...",
    people: "Kişiler", no_chats: "Sohbet yok. Kişiler'e gidin.",
    find_people: "Birini bul", online: "Çevrimiçi", offline: "Çevrimdışı",
    type_message: "Mesaj...", send: "Gönder", logout: "Çıkış yap",
    name: "Ad", username: "Kullanıcı adı", encryption: "Şifreleme",
    appearance: "Görünüm", notifications_tab: "Bildirimler",
    devices: "Cihazlar", language: "Dil",
    edit_profile: "Profili düzenle", save: "Kaydet", cancel: "İptal",
    display_name: "Görünen ad", username_hint: "a-z, 0-9 ve _ (3–32 karakter)",
    profile_saved: "Profil kaydedildi!", no_messages: "Mesaj yok",
    deleted_msg: "Mesaj silindi", typing: "yazıyor...",
    call_history_empty: "Arama geçmişi yok",
  },
  kk: {
    chats: "Чаттар", channels: "Арналар", bots: "Боттар", calls: "Қоңыраулар",
    contacts: "Контактілер", settings: "Параметрлер", profile: "Профиль",
    search_chats: "Чаттарды іздеу...", search_people: "Аты немесе @username бойынша іздеу...",
    people: "Адамдар", no_chats: "Чат жоқ. Контактілерге өтіңіз.",
    find_people: "Әңгімелесуші табу", online: "Онлайн", offline: "Желіде жоқ",
    type_message: "Хабарлама...", send: "Жіберу", logout: "Шығу",
    name: "Аты", username: "Логин", encryption: "Шифрлау",
    appearance: "Безендіру", notifications_tab: "Хабарландырулар",
    devices: "Құрылғылар", language: "Тіл",
    edit_profile: "Профильді өңдеу", save: "Сақтау", cancel: "Бас тарту",
    display_name: "Көрсетілетін аты", username_hint: "a-z, 0-9 және _ (3–32 таңба)",
    profile_saved: "Профиль сақталды!", no_messages: "Хабарламалар жоқ",
    deleted_msg: "Хабарлама жойылды", typing: "жазуда...",
    call_history_empty: "Қоңырау тарихы жоқ",
  },
};

export function useT(lang: string) {
  const dict = I18N[lang] || I18N["ru"];
  return (key: string) => dict[key] || I18N["ru"][key] || key;
}

export const LANGUAGES = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "kk", label: "Қазақша", flag: "🇰🇿" },
];
export const REGIONS = [
  { code: "RU", label: "Россия", flag: "🇷🇺" },
  { code: "KZ", label: "Казахстан", flag: "🇰🇿" },
  { code: "BY", label: "Беларусь", flag: "🇧🇾" },
  { code: "US", label: "США", flag: "🇺🇸" },
  { code: "DE", label: "Германия", flag: "🇩🇪" },
  { code: "GB", label: "Великобритания", flag: "🇬🇧" },
  { code: "TR", label: "Турция", flag: "🇹🇷" },
  { code: "OTHER", label: "Другой", flag: "🌐" },
];