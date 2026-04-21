"""
WorChat Auth API — регистрация, вход, выход, текущий пользователь, обновление профиля.
POST / {action: register}        — создать аккаунт (username, display_name, password, secret_word?)
POST / {action: login}           — войти
POST / {action: logout}          — выйти
POST / {action: update_profile}  — обновить имя / username
POST / {action: change_password} — сменить пароль (current_password, new_password)
POST / {action: recover_account} — восстановить аккаунт по secret_word → установить new_password
POST / {action: ping_online}     — обновить статус онлайн (вызывается каждые 30 сек)
GET  /                           — текущий пользователь (по токену)
"""
import json
import os
import hashlib
import secrets
import random
import psycopg2
import re

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")
COLORS = ["#4F86C6", "#5BA87A", "#C47DB5", "#D4885A", "#7B8FA6", "#5966C0", "#B5574A", "#6A9E72"]

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name[:2].upper()

def valid_username(u: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9_]{3,32}$', u))

def get_user_by_token(conn, token: str):
    """
    Возвращает пользователя по токену сессии.
    Статус: 'online' если last_seen_at > NOW() - 2 минуты, иначе 'offline'.
    """
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
               u.status, u.avatar_url, u.last_seen_at
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None

    user_id, username, display_name, avatar_color, avatar_initials, status, avatar_url, last_seen_at = row

    # Пересчитываем онлайн-статус по last_seen_at
    computed_status = status
    if last_seen_at is not None:
        cur2 = conn.cursor()
        cur2.execute("SELECT %s > NOW() - INTERVAL '2 minutes'", (last_seen_at,))
        is_recent = cur2.fetchone()[0]
        cur2.close()
        computed_status = "online" if is_recent else "offline"

    return {
        "id": user_id,
        "username": username,
        "display_name": display_name,
        "avatar_color": avatar_color,
        "avatar_initials": avatar_initials,
        "status": computed_status,
        "avatar_url": avatar_url,
    }

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    """Auth handler — register, login, logout, get user, update profile, change_password, recover_account, ping_online."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = event.get("headers", {}).get("X-Session-Token", "")

    conn = get_conn()
    try:
        if method == "GET":
            if not token:
                return err(401, "Не авторизован")
            user = get_user_by_token(conn, token)
            if not user:
                return err(401, "Сессия истекла")
            return ok({"user": user})

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            action = body.get("action", "")

            # ------------------------------------------------------------------
            if action == "register":
                username = (body.get("username") or "").strip().lower()
                display_name = (body.get("display_name") or "").strip()
                password = body.get("password") or ""
                secret_word = (body.get("secret_word") or "").strip()

                if not username or not display_name or not password:
                    return err(400, "Заполните все поля")
                if len(password) < 6:
                    return err(400, "Пароль минимум 6 символов")
                if not valid_username(username):
                    return err(400, "Логин: только латиница, цифры и _ (3–32 символа)")

                cur = conn.cursor()
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (username,))
                if cur.fetchone():
                    cur.close()
                    return err(409, "Пользователь с таким логином уже существует")

                color = random.choice(COLORS)
                initials = get_initials(display_name)
                pw_hash = hash_password(password)
                sw_hash = hash_password(secret_word) if secret_word else None

                # Пробуем INSERT с secret_word_hash; если колонки нет — без неё
                try:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.users
                            (username, display_name, password_hash, avatar_color, avatar_initials, status, secret_word_hash)
                        VALUES (%s, %s, %s, %s, %s, 'online', %s) RETURNING id
                    """, (username, display_name, pw_hash, color, initials, sw_hash))
                except Exception:
                    conn.rollback()
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.users
                            (username, display_name, password_hash, avatar_color, avatar_initials, status)
                        VALUES (%s, %s, %s, %s, %s, 'online') RETURNING id
                    """, (username, display_name, pw_hash, color, initials))

                user_id = cur.fetchone()[0]

                session_token = secrets.token_hex(32)
                cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, session_token))
                conn.commit()
                cur.close()

                return ok({
                    "token": session_token,
                    "user": {
                        "id": user_id, "username": username, "display_name": display_name,
                        "avatar_color": color, "avatar_initials": initials,
                        "status": "online", "avatar_url": None,
                    }
                })

            # ------------------------------------------------------------------
            if action == "login":
                username = (body.get("username") or "").strip().lower()
                password = body.get("password") or ""

                if not username or not password:
                    return err(400, "Введите логин и пароль")

                cur = conn.cursor()
                pw_hash = hash_password(password)
                cur.execute(f"""
                    SELECT id, username, display_name, avatar_color, avatar_initials, avatar_url
                    FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s
                """, (username, pw_hash))
                row = cur.fetchone()
                if not row:
                    cur.close()
                    return err(401, "Неверный логин или пароль")

                user_id, uname, dname, color, initials, avatar_url = row
                cur.execute(f"""
                    UPDATE {SCHEMA}.users SET status = 'online', last_seen_at = NOW() WHERE id = %s
                """, (user_id,))
                session_token = secrets.token_hex(32)
                cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, session_token))
                conn.commit()
                cur.close()

                return ok({
                    "token": session_token,
                    "user": {
                        "id": user_id, "username": uname, "display_name": dname,
                        "avatar_color": color, "avatar_initials": initials,
                        "status": "online", "avatar_url": avatar_url,
                    }
                })

            # ------------------------------------------------------------------
            if action == "logout":
                if token:
                    cur = conn.cursor()
                    cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
                    cur.execute(f"""
                        UPDATE {SCHEMA}.users SET status = 'offline', last_seen_at = NOW()
                        WHERE id = (SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s)
                    """, (token,))
                    conn.commit()
                    cur.close()
                return ok({"ok": True})

            # ------------------------------------------------------------------
            if action == "update_profile":
                if not token:
                    return err(401, "Не авторизован")
                user = get_user_by_token(conn, token)
                if not user:
                    return err(401, "Сессия истекла")

                display_name = (body.get("display_name") or "").strip()
                new_username = (body.get("username") or "").strip().lower()

                if not display_name:
                    return err(400, "Имя не может быть пустым")
                if len(display_name) > 64:
                    return err(400, "Имя слишком длинное (макс. 64 символа)")

                cur = conn.cursor()
                new_initials = get_initials(display_name)

                if new_username and new_username != user["username"]:
                    if not valid_username(new_username):
                        cur.close()
                        return err(400, "Username: только a-z, 0-9 и _ (3–32 символа)")
                    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s AND id != %s", (new_username, user["id"]))
                    if cur.fetchone():
                        cur.close()
                        return err(409, "Этот username уже занят")
                    cur.execute(f"""
                        UPDATE {SCHEMA}.users
                        SET display_name = %s, avatar_initials = %s, username = %s
                        WHERE id = %s
                    """, (display_name, new_initials, new_username, user["id"]))
                else:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.users
                        SET display_name = %s, avatar_initials = %s
                        WHERE id = %s
                    """, (display_name, new_initials, user["id"]))

                conn.commit()
                cur.close()

                updated = get_user_by_token(conn, token)
                return ok({"user": updated})

            # ------------------------------------------------------------------
            if action == "change_password":
                if not token:
                    return err(401, "Не авторизован")
                user = get_user_by_token(conn, token)
                if not user:
                    return err(401, "Сессия истекла")

                current_password = body.get("current_password") or ""
                new_password = body.get("new_password") or ""

                if not current_password or not new_password:
                    return err(400, "Заполните текущий и новый пароль")
                if len(new_password) < 6:
                    return err(400, "Новый пароль минимум 6 символов")

                cur = conn.cursor()
                cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE id = %s", (user["id"],))
                row = cur.fetchone()
                if not row or row[0] != hash_password(current_password):
                    cur.close()
                    return err(401, "Текущий пароль неверен")

                cur.execute(f"""
                    UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s
                """, (hash_password(new_password), user["id"]))
                conn.commit()
                cur.close()

                return ok({"ok": True})

            # ------------------------------------------------------------------
            if action == "recover_account":
                username = (body.get("username") or "").strip().lower()
                secret_word = (body.get("secret_word") or "").strip()
                new_password = body.get("new_password") or ""

                if not username or not secret_word or not new_password:
                    return err(400, "Укажите username, секретное слово и новый пароль")
                if len(new_password) < 6:
                    return err(400, "Новый пароль минимум 6 символов")

                cur = conn.cursor()
                try:
                    cur.execute(f"""
                        SELECT id, secret_word_hash FROM {SCHEMA}.users WHERE username = %s
                    """, (username,))
                    row = cur.fetchone()
                except Exception:
                    conn.rollback()
                    cur.close()
                    return err(400, "Восстановление по секретному слову недоступно")

                if not row:
                    cur.close()
                    return err(404, "Пользователь не найден")

                user_id, sw_hash = row
                if not sw_hash or sw_hash != hash_password(secret_word):
                    cur.close()
                    return err(401, "Секретное слово неверно")

                cur.execute(f"""
                    UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s
                """, (hash_password(new_password), user_id))
                # Инвалидируем все активные сессии пользователя для безопасности
                cur.execute(f"""
                    UPDATE {SCHEMA}.sessions SET expires_at = NOW()
                    WHERE user_id = %s AND expires_at > NOW()
                """, (user_id,))
                conn.commit()
                cur.close()

                return ok({"ok": True})

            # ------------------------------------------------------------------
            if action == "ping_online":
                if not token:
                    return err(401, "Не авторизован")
                cur = conn.cursor()
                cur.execute(f"""
                    UPDATE {SCHEMA}.users SET status = 'online', last_seen_at = NOW()
                    WHERE id = (
                        SELECT user_id FROM {SCHEMA}.sessions
                        WHERE token = %s AND expires_at > NOW()
                    )
                """, (token,))
                conn.commit()
                cur.close()
                return ok({"ok": True})

        return err(404, "Not found")

    finally:
        conn.close()
