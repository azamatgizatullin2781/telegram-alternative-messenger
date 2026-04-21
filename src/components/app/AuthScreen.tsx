import React, { useState } from "react";
import Icon from "@/components/ui/icon";
import { User } from "@/types";
import { apiFetch, AUTH_URL } from "@/lib/api";

type Mode = "login" | "register" | "recover";

export function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ username: "", display_name: "", password: "", secret_word: "", new_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (mode === "login") {
      const { ok, data } = await apiFetch(AUTH_URL, {
        method: "POST",
        body: JSON.stringify({ action: "login", username: form.username.trim().toLowerCase(), password: form.password }),
      });
      setLoading(false);
      if (ok) { localStorage.setItem("wc_token", data.token); onAuth(data.user); }
      else setError(data.error || "Неверный логин или пароль");
    } else if (mode === "register") {
      if (!form.username || !form.display_name || !form.password) { setError("Заполните все поля"); setLoading(false); return; }
      if (form.password.length < 6) { setError("Пароль минимум 6 символов"); setLoading(false); return; }
      const { ok, data } = await apiFetch(AUTH_URL, {
        method: "POST",
        body: JSON.stringify({ action: "register", username: form.username.trim().toLowerCase(), display_name: form.display_name.trim(), password: form.password, secret_word: form.secret_word }),
      });
      setLoading(false);
      if (ok) { localStorage.setItem("wc_token", data.token); onAuth(data.user); }
      else setError(data.error || "Ошибка регистрации");
    } else if (mode === "recover") {
      if (!form.username || !form.secret_word || !form.new_password) { setError("Заполните все поля"); setLoading(false); return; }
      if (form.new_password.length < 6) { setError("Новый пароль минимум 6 символов"); setLoading(false); return; }
      const { ok, data } = await apiFetch(AUTH_URL, {
        method: "POST",
        body: JSON.stringify({ action: "recover_account", username: form.username.trim().toLowerCase(), secret_word: form.secret_word, new_password: form.new_password }),
      });
      setLoading(false);
      if (ok) { setSuccess("Пароль успешно изменён. Теперь войдите с новым паролем."); setMode("login"); setForm(f => ({ ...f, password: "" })); }
      else setError(data.error || "Ошибка восстановления");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25">
            <Icon name="MessageSquare" size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">WorChat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Войдите в аккаунт" : mode === "register" ? "Создайте аккаунт" : "Восстановление аккаунта"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          {/* Tabs */}
          {mode !== "recover" && (
            <div className="flex mb-5 bg-muted rounded-xl p-0.5">
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                    ${mode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  {m === "login" ? "Вход" : "Регистрация"}
                </button>
              ))}
            </div>
          )}

          {mode === "recover" && (
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Icon name="ArrowLeft" size={16} className="text-muted-foreground" />
              </button>
              <span className="text-sm font-semibold">Восстановление доступа</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {/* Login field */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Логин</label>
              <input value={form.username} onChange={e => set("username", e.target.value)}
                placeholder="ваш_логин" autoCapitalize="none" autoCorrect="off"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {/* Display name (register only) */}
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Имя</label>
                <input value={form.display_name} onChange={e => set("display_name", e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}

            {/* Password (login and register) */}
            {mode !== "recover" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Пароль</label>
                <input value={form.password} onChange={e => set("password", e.target.value)}
                  type="password" placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}

            {/* Secret word (register only) */}
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Секретное слово <span className="text-muted-foreground/60">(для восстановления)</span></label>
                <input value={form.secret_word} onChange={e => set("secret_word", e.target.value)}
                  placeholder="Слово для восстановления аккаунта"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                <p className="text-[11px] text-muted-foreground mt-1">Запомните это слово — оно нужно для восстановления пароля</p>
              </div>
            )}

            {/* Recover fields */}
            {mode === "recover" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Секретное слово</label>
                  <input value={form.secret_word} onChange={e => set("secret_word", e.target.value)}
                    placeholder="Введите секретное слово"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Новый пароль</label>
                  <input value={form.new_password} onChange={e => set("new_password", e.target.value)}
                    type="password" placeholder="Минимум 6 символов"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 text-green-600 text-xs">
                <Icon name="CheckCircle" size={14} />{success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Восстановить пароль"}
            </button>
          </form>

          {/* Forgot password link */}
          {mode === "login" && (
            <button onClick={() => { setMode("recover"); setError(""); setSuccess(""); }}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-primary transition-colors text-center">
              Забыли пароль? Восстановить аккаунт
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Icon name="Lock" size={11} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Сквозное шифрование · WorChat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
