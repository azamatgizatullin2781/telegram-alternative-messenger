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
  language: string;
  region: string;
  fontSize: "sm" | "md" | "lg";
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
  notifications: true, notifSound: true, notifPreview: true,
  language: "ru", region: "RU", fontSize: "md",
};

export const LANGUAGES = [
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
export const REGIONS = [
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
