"""
WorChat Chats API — список чатов, контакты, создание чата, поиск людей.
GET  /?action=chats                  — мои чаты
GET  /?action=contacts               — мои добавленные контакты (из user_contacts)
GET  /?action=all_users              — все пользователи (для поиска новых)
GET  /?action=search_users&q=...     — поиск по username/display_name
GET  /?action=blocked                — список заблокированных пользователей
POST / {action: start}               — начать чат с пользователем
POST / {action: add_contact}         — добавить пользователя в контакты
POST / {action: remove_contact}      — удалить из контактов
POST / {action: block_user}          — заблокировать пользователя
POST / {action: unblock_user}        — разблокировать пользователя
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")
MSK = timedelta(hours=3)

def fmt_time(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone(MSK)).strftime("%H:%M")

def compute_status(status, last_seen_at):
    """Возвращает 'online' если last_seen_at > NOW() - 2 минуты, иначе 'offline'."""
    if last_seen_at is None:
        return status or "offline"
    now = datetime.now(timezone.utc)
    if last_seen_at.tzinfo is None:
        last_seen_at = last_seen_at.replace(tzinfo=timezone.utc)
    if (now - last_seen_at).total_seconds() < 120:
        return "online"
    return "offline"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials, u.status
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "display_name": row[2],
            "avatar_color": row[3], "avatar_initials": row[4], "status": row[5]}

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = event.get("headers", {}).get("X-Session-Token", "")

    if not token:
        return err(401, "Не авторизован")

    conn = get_conn()
    try:
        user = get_user_by_token(conn, token)
        if not user:
            return err(401, "Сессия истекла")

        params = event.get("queryStringParameters") or {}
        action = params.get("action", "chats")

        # -----------------------------------------------------------------------
        if method == "GET" and action == "search_users":
            q = params.get("q", "").strip()
            if not q:
                return ok({"users": []})
            cur = conn.cursor()
            like = f"%{q}%"
            cur.execute(f"""
                SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
                       u.status, u.last_seen_at,
                       EXISTS(
                           SELECT 1 FROM {SCHEMA}.user_contacts uc
                           WHERE uc.user_id = %s AND uc.contact_id = u.id
                       ) AS in_contact,
                       EXISTS(
                           SELECT 1 FROM {SCHEMA}.user_blocks ub
                           WHERE ub.blocker_id = %s AND ub.blocked_id = u.id
                       ) AS is_blocked
                FROM {SCHEMA}.users u
                WHERE u.id != %s AND (
                    LOWER(u.username) LIKE LOWER(%s)
                    OR LOWER(u.display_name) LIKE LOWER(%s)
                    OR CAST(u.id AS TEXT) = %s
                )
                ORDER BY
                    CASE WHEN LOWER(u.username) = LOWER(%s) THEN 0
                         WHEN LOWER(u.display_name) = LOWER(%s) THEN 1
                         ELSE 2 END,
                    u.display_name
                LIMIT 20
            """, (user["id"], user["id"], user["id"], like, like, q, q, q))
            rows = cur.fetchall()
            cur.close()
            users = [
                {
                    "id": r[0], "username": r[1], "display_name": r[2],
                    "avatar_color": r[3], "avatar_initials": r[4],
                    "status": compute_status(r[5], r[6]),
                    "in_contact": bool(r[7]),
                    "is_blocked": bool(r[8]),
                }
                for r in rows
            ]
            return ok({"users": users})

        # -----------------------------------------------------------------------
        if method == "GET" and action == "contacts":
            # Только пользователи, которых текущий юзер добавил в контакты
            cur = conn.cursor()
            cur.execute(f"""
                SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
                       u.status, u.last_seen_at
                FROM {SCHEMA}.user_contacts uc
                JOIN {SCHEMA}.users u ON u.id = uc.contact_id
                WHERE uc.user_id = %s
                ORDER BY u.display_name
            """, (user["id"],))
            rows = cur.fetchall()
            cur.close()
            contacts = [
                {
                    "id": r[0], "username": r[1], "display_name": r[2],
                    "avatar_color": r[3], "avatar_initials": r[4],
                    "status": compute_status(r[5], r[6]),
                    "last_seen_at": fmt_time(r[6]),
                    "in_contact": True,
                }
                for r in rows
            ]
            return ok({"contacts": contacts})

        # -----------------------------------------------------------------------
        if method == "GET" and action == "all_users":
            # Все пользователи кроме текущего (для поиска новых контактов)
            cur = conn.cursor()
            cur.execute(f"""
                SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
                       u.status, u.last_seen_at,
                       EXISTS(
                           SELECT 1 FROM {SCHEMA}.user_contacts uc
                           WHERE uc.user_id = %s AND uc.contact_id = u.id
                       ) AS in_contact,
                       EXISTS(
                           SELECT 1 FROM {SCHEMA}.user_blocks ub
                           WHERE ub.blocker_id = %s AND ub.blocked_id = u.id
                       ) AS is_blocked
                FROM {SCHEMA}.users u
                WHERE u.id != %s
                ORDER BY u.display_name
            """, (user["id"], user["id"], user["id"]))
            rows = cur.fetchall()
            cur.close()
            users = [
                {
                    "id": r[0], "username": r[1], "display_name": r[2],
                    "avatar_color": r[3], "avatar_initials": r[4],
                    "status": compute_status(r[5], r[6]),
                    "last_seen_at": fmt_time(r[6]),
                    "in_contact": bool(r[7]),
                    "is_blocked": bool(r[8]),
                }
                for r in rows
            ]
            return ok({"users": users})

        # -----------------------------------------------------------------------
        if method == "GET" and action == "blocked":
            cur = conn.cursor()
            cur.execute(f"""
                SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
                       u.status, u.last_seen_at
                FROM {SCHEMA}.user_blocks ub
                JOIN {SCHEMA}.users u ON u.id = ub.blocked_id
                WHERE ub.blocker_id = %s
                ORDER BY u.display_name
            """, (user["id"],))
            rows = cur.fetchall()
            cur.close()
            blocked = [
                {
                    "id": r[0], "username": r[1], "display_name": r[2],
                    "avatar_color": r[3], "avatar_initials": r[4],
                    "status": compute_status(r[5], r[6]),
                    "last_seen_at": fmt_time(r[6]),
                    "is_blocked": True,
                }
                for r in rows
            ]
            return ok({"blocked": blocked})

        # -----------------------------------------------------------------------
        if method == "GET" and action == "chats":
            cur = conn.cursor()
            cur.execute(f"""
                SELECT c.id, c.type,
                       u.id, u.username, u.display_name, u.avatar_color, u.avatar_initials,
                       u.status, u.last_seen_at,
                       (SELECT text FROM {SCHEMA}.messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_text,
                       (SELECT created_at FROM {SCHEMA}.messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_time,
                       (SELECT sender_id FROM {SCHEMA}.messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_sender,
                       (SELECT COUNT(*) FROM {SCHEMA}.messages m WHERE m.chat_id = c.id AND m.sender_id != %s AND m.status = 'sent') as unread
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s
                JOIN {SCHEMA}.users u ON u.id = cm2.user_id
                WHERE c.type = 'direct'
                ORDER BY last_time DESC NULLS LAST
            """, (user["id"], user["id"], user["id"]))
            rows = cur.fetchall()
            cur.close()
            chats = []
            for r in rows:
                chats.append({
                    "chat_id": r[0], "type": r[1],
                    "partner": {
                        "id": r[2], "username": r[3], "display_name": r[4],
                        "avatar_color": r[5], "avatar_initials": r[6],
                        "status": compute_status(r[7], r[8]),
                    },
                    "last_text": r[9] or "",
                    "last_time": fmt_time(r[10]) or "",
                    "last_sender_id": r[11],
                    "unread": int(r[12])
                })
            return ok({"chats": chats, "me": user})

        # -----------------------------------------------------------------------
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            post_action = body.get("action", "start")

            if post_action == "start":
                partner_id = body.get("partner_id")
                if not partner_id:
                    return err(400, "partner_id обязателен")

                cur = conn.cursor()
                cur.execute(f"""
                    SELECT c.id FROM {SCHEMA}.chats c
                    JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
                    JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
                    WHERE c.type = 'direct' LIMIT 1
                """, (user["id"], partner_id))
                existing = cur.fetchone()
                if existing:
                    cur.close()
                    return ok({"chat_id": existing[0]})

                cur.execute(f"INSERT INTO {SCHEMA}.chats (type) VALUES ('direct') RETURNING id")
                chat_id = cur.fetchone()[0]
                cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, user["id"]))
                cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, partner_id))
                conn.commit()
                cur.close()
                return ok({"chat_id": chat_id})

            # -------------------------------------------------------------------
            if post_action == "add_contact":
                contact_id = body.get("contact_id")
                if not contact_id:
                    return err(400, "contact_id обязателен")
                if contact_id == user["id"]:
                    return err(400, "Нельзя добавить себя в контакты")

                cur = conn.cursor()
                # Проверяем, что такой пользователь существует
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s", (contact_id,))
                if not cur.fetchone():
                    cur.close()
                    return err(404, "Пользователь не найден")

                # INSERT OR IGNORE через ON CONFLICT
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.user_contacts (user_id, contact_id)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, contact_id) DO NOTHING
                """, (user["id"], contact_id))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            # -------------------------------------------------------------------
            if post_action == "remove_contact":
                contact_id = body.get("contact_id")
                if not contact_id:
                    return err(400, "contact_id обязателен")

                cur = conn.cursor()
                cur.execute(f"""
                    DELETE FROM {SCHEMA}.user_contacts
                    WHERE user_id = %s AND contact_id = %s
                """, (user["id"], contact_id))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            # -------------------------------------------------------------------
            if post_action == "block_user":
                target_id = body.get("user_id")
                if not target_id:
                    return err(400, "user_id обязателен")
                if target_id == user["id"]:
                    return err(400, "Нельзя заблокировать себя")

                cur = conn.cursor()
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s", (target_id,))
                if not cur.fetchone():
                    cur.close()
                    return err(404, "Пользователь не найден")

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.user_blocks (blocker_id, blocked_id)
                    VALUES (%s, %s)
                    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
                """, (user["id"], target_id))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            # -------------------------------------------------------------------
            if post_action == "unblock_user":
                target_id = body.get("user_id")
                if not target_id:
                    return err(400, "user_id обязателен")

                cur = conn.cursor()
                cur.execute(f"""
                    DELETE FROM {SCHEMA}.user_blocks
                    WHERE blocker_id = %s AND blocked_id = %s
                """, (user["id"], target_id))
                conn.commit()
                cur.close()
                return ok({"ok": True})

        return err(404, "Not found")

    finally:
        conn.close()
