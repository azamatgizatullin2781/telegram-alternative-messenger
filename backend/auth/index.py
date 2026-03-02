"""
WorChat Auth API — регистрация, вход, выход, текущий пользователь.
POST / {action: register} — создать аккаунт
POST / {action: login}    — войти
POST / {action: logout}   — выйти
GET  /                    — текущий пользователь (по токену)
"""
import json
import os
import hashlib
import secrets
import random
import psycopg2

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

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials, u.status, u.avatar_url
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "display_name": row[2],
            "avatar_color": row[3], "avatar_initials": row[4], "status": row[5], "avatar_url": row[6]}

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
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

            if action == "register":
                username = (body.get("username") or "").strip().lower()
                display_name = (body.get("display_name") or "").strip()
                password = body.get("password") or ""

                if not username or not display_name or not password:
                    return err(400, "Заполните все поля")
                if len(password) < 6:
                    return err(400, "Пароль минимум 6 символов")
                if len(username) < 3:
                    return err(400, "Логин минимум 3 символа")

                cur = conn.cursor()
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (username,))
                if cur.fetchone():
                    cur.close()
                    return err(409, "Пользователь с таким логином уже существует")

                color = random.choice(COLORS)
                initials = get_initials(display_name)
                pw_hash = hash_password(password)

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.users (username, display_name, password_hash, avatar_color, avatar_initials, status)
                    VALUES (%s, %s, %s, %s, %s, 'online') RETURNING id
                """, (username, display_name, pw_hash, color, initials))
                user_id = cur.fetchone()[0]

                session_token = secrets.token_hex(32)
                cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, session_token))
                conn.commit()
                cur.close()

                return ok({
                    "token": session_token,
                    "user": {"id": user_id, "username": username, "display_name": display_name,
                             "avatar_color": color, "avatar_initials": initials, "status": "online"}
                })

            if action == "login":
                username = (body.get("username") or "").strip().lower()
                password = body.get("password") or ""

                if not username or not password:
                    return err(400, "Введите логин и пароль")

                cur = conn.cursor()
                pw_hash = hash_password(password)
                cur.execute(f"""
                    SELECT id, username, display_name, avatar_color, avatar_initials
                    FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s
                """, (username, pw_hash))
                row = cur.fetchone()
                if not row:
                    cur.close()
                    return err(401, "Неверный логин или пароль")

                user_id, uname, dname, color, initials = row
                cur.execute(f"UPDATE {SCHEMA}.users SET status = 'online', last_seen_at = NOW() WHERE id = %s", (user_id,))
                session_token = secrets.token_hex(32)
                cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, session_token))
                conn.commit()
                cur.close()

                return ok({
                    "token": session_token,
                    "user": {"id": user_id, "username": uname, "display_name": dname,
                             "avatar_color": color, "avatar_initials": initials, "status": "online"}
                })

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

            return err(400, "Неизвестный action")

        return err(404, "Not found")

    finally:
        conn.close()