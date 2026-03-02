import React, { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Channel } from "@/types";

// ─── CreateChannelModal ────────────────────────────────────────────────────────
export function CreateChannelModal({ onClose, onCreate }: {
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
