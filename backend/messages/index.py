"""
WorChat Messages API — полный функционал мессенджера.
GET  /?chat_id=X&after=ID — сообщения чата (polling: after=last_id для новых)
GET  /?action=typing&chat_id=X — кто сейчас печатает
POST / {action: send}       — отправить сообщение
POST / {action: edit}       — редактировать своё сообщение
POST / {action: remove}     — удалить своё сообщение (soft delete)
POST / {action: react}      — поставить/снять реакцию
POST / {action: typing}     — уведомить что печатаю
POST / {action: read}       — отметить прочитанными
POST / {action: clear_chat} — очистить переписку
POST / {action: delete_chat}— удалить чат
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")
MSK = timedelta(hours=3)

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def fmt_time(dt):
    """Форматируем datetime в HH:MM по московскому времени (+3 UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    msk_dt = dt.astimezone(timezone(MSK))
    return msk_dt.strftime("%H:%M")

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
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def row_to_msg(r, me_id, reactions_map=None):
    msg_id = r[0]
    return {
        "id": msg_id,
        "sender_id": r[1],
        "text": r[2] or "",
        "status": r[3],
        "time": fmt_time(r[4]),
        "out": r[1] == me_id,
        "msg_type": r[5] or "text",
        "media_url": r[6],
        "media_name": r[7],
        "media_size": r[8],
        "media_duration": r[9],
        "geo_lat": r[10],
        "geo_lon": r[11],
        "contact_name": r[12],
        "contact_phone": r[13],
        "reply_to_id": r[14],
        "edited_at": fmt_time(r[15]),
        "is_removed": bool(r[16]) if r[16] is not None else False,
        "forwarded_from_id": r[17] if len(r) > 17 else None,
        "reactions": reactions_map.get(msg_id, []) if reactions_map else [],
    }

def load_reactions(conn, message_ids):
    if not message_ids:
        return {}
    cur = conn.cursor()
    ids_str = ",".join(str(i) for i in message_ids)
    cur.execute(f"""
        SELECT mr.message_id, mr.emoji, mr.user_id, u.display_name
        FROM {SCHEMA}.message_reactions mr
        JOIN {SCHEMA}.users u ON u.id = mr.user_id
        WHERE mr.message_id IN ({ids_str}) AND mr.emoji != ''
        ORDER BY mr.created_at
    """)
    rows = cur.fetchall()
    cur.close()
    result = {}
    for r in rows:
        mid = r[0]
        if mid not in result:
            result[mid] = []
        result[mid].append({"emoji": r[1], "user_id": r[2], "display_name": r[3]})
    return result

def handler(event: dict, context) -> dict:
    """Messages handler — send, edit, remove, reactions, typing, polling."""
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

        # Update user last_seen
        cur0 = conn.cursor()
        cur0.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW(), status = 'online' WHERE id = %s", (user["id"],))
        conn.commit()
        cur0.close()

        if method == "GET":
            params = event.get("queryStringParameters") or {}
            action = params.get("action", "")

            # Typing status poll
            if action == "typing":
                chat_id = params.get("chat_id")
                if not chat_id:
                    return err(400, "chat_id обязателен")
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT u.id, u.display_name
                    FROM {SCHEMA}.typing_status ts
                    JOIN {SCHEMA}.users u ON u.id = ts.user_id
                    WHERE ts.chat_id = %s AND ts.user_id != %s
                      AND ts.typed_at > NOW() - INTERVAL '5 seconds'
                """, (chat_id, user["id"]))
                typers = [{"id": r[0], "display_name": r[1]} for r in cur.fetchall()]
                cur.close()
                return ok({"typing": typers})

            # Messages (full or polling)
            chat_id = params.get("chat_id")
            if not chat_id:
                return err(400, "chat_id обязателен")

            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
            if not cur.fetchone():
                cur.close()
                return err(403, "Нет доступа к чату")

            after_id = params.get("after")
            if after_id:
                cur.execute(f"""
                    SELECT m.id, m.sender_id, m.text, m.status,
                           m.created_at,
                           m.msg_type, m.media_url, m.media_name, m.media_size, m.media_duration,
                           m.geo_lat, m.geo_lon, m.contact_name, m.contact_phone, m.reply_to_id,
                           m.edited_at, m.is_removed, m.forwarded_from_id
                    FROM {SCHEMA}.messages m
                    WHERE m.chat_id = %s AND m.id > %s
                    ORDER BY m.created_at ASC
                    LIMIT 50
                """, (chat_id, int(after_id)))
            else:
                cur.execute(f"""
                    SELECT m.id, m.sender_id, m.text, m.status,
                           m.created_at,
                           m.msg_type, m.media_url, m.media_name, m.media_size, m.media_duration,
                           m.geo_lat, m.geo_lon, m.contact_name, m.contact_phone, m.reply_to_id,
                           m.edited_at, m.is_removed, m.forwarded_from_id
                    FROM {SCHEMA}.messages m
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC
                    LIMIT 200
                """, (chat_id,))

            rows = cur.fetchall()

            # Mark incoming as read
            cur.execute(f"""
                UPDATE {SCHEMA}.messages SET status = 'read'
                WHERE chat_id = %s AND sender_id != %s AND status = 'sent'
            """, (chat_id, user["id"]))
            conn.commit()

            msg_ids = [r[0] for r in rows]
            reactions_map = load_reactions(conn, msg_ids)
            cur.close()

            msgs = [row_to_msg(r, user["id"], reactions_map) for r in rows]
            return ok({"messages": msgs, "me_id": user["id"]})

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            action = body.get("action", "send")

            if action == "send":
                chat_id = body.get("chat_id")
                if not chat_id:
                    return err(400, "chat_id обязателен")

                msg_type = body.get("msg_type", "text")
                text = (body.get("text") or "").strip()
                media_url = body.get("media_url")
                media_name = body.get("media_name")
                media_size = body.get("media_size")
                media_duration = body.get("media_duration")
                geo_lat = body.get("geo_lat")
                geo_lon = body.get("geo_lon")
                contact_name = body.get("contact_name")
                contact_phone = body.get("contact_phone")
                reply_to_id = body.get("reply_to_id")

                if msg_type == "text" and not text:
                    return err(400, "text обязателен")

                cur = conn.cursor()
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет доступа к чату")

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.messages
                      (chat_id, sender_id, text, status, msg_type, media_url, media_name,
                       media_size, media_duration, geo_lat, geo_lon, contact_name, contact_phone, reply_to_id)
                    VALUES (%s, %s, %s, 'sent', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (chat_id, user["id"], text, msg_type, media_url, media_name,
                      media_size, media_duration, geo_lat, geo_lon, contact_name, contact_phone, reply_to_id))
                row = cur.fetchone()
                conn.commit()
                cur.close()

                return ok({
                    "message": {
                        "id": row[0], "sender_id": user["id"], "text": text,
                        "status": "sent", "time": fmt_time(row[1]), "out": True,
                        "msg_type": msg_type, "media_url": media_url, "media_name": media_name,
                        "media_size": media_size, "media_duration": media_duration,
                        "geo_lat": geo_lat, "geo_lon": geo_lon,
                        "contact_name": contact_name, "contact_phone": contact_phone,
                        "reply_to_id": reply_to_id, "edited_at": None, "is_removed": False, "reactions": [],
                    }
                })

            if action == "edit":
                msg_id = body.get("message_id")
                new_text = (body.get("text") or "").strip()
                if not msg_id or not new_text:
                    return err(400, "message_id и text обязательны")
                cur = conn.cursor()
                cur.execute(f"SELECT sender_id FROM {SCHEMA}.messages WHERE id = %s", (msg_id,))
                row = cur.fetchone()
                if not row or row[0] != user["id"]:
                    cur.close()
                    return err(403, "Нельзя редактировать чужое сообщение")
                cur.execute(f"""
                    UPDATE {SCHEMA}.messages SET text = %s, edited_at = NOW()
                    WHERE id = %s
                    RETURNING edited_at
                """, (new_text, msg_id))
                edited_at = cur.fetchone()[0]
                conn.commit()
                cur.close()
                return ok({"ok": True, "message_id": msg_id, "text": new_text, "edited_at": fmt_time(edited_at)})

            if action == "remove":
                msg_id = body.get("message_id")
                if not msg_id:
                    return err(400, "message_id обязателен")
                cur = conn.cursor()
                cur.execute(f"SELECT sender_id FROM {SCHEMA}.messages WHERE id = %s", (msg_id,))
                row = cur.fetchone()
                if not row or row[0] != user["id"]:
                    cur.close()
                    return err(403, "Нельзя удалить чужое сообщение")
                cur.execute(f"UPDATE {SCHEMA}.messages SET is_removed = TRUE, text = '' WHERE id = %s", (msg_id,))
                conn.commit()
                cur.close()
                return ok({"ok": True, "message_id": msg_id})

            if action == "react":
                msg_id = body.get("message_id")
                emoji = (body.get("emoji") or "").strip()
                if not msg_id or not emoji:
                    return err(400, "message_id и emoji обязательны")
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT emoji FROM {SCHEMA}.message_reactions
                    WHERE message_id = %s AND user_id = %s
                """, (msg_id, user["id"]))
                existing = cur.fetchone()
                if existing and existing[0] == emoji:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.message_reactions SET emoji = ''
                        WHERE message_id = %s AND user_id = %s
                    """, (msg_id, user["id"]))
                    conn.commit()
                    cur.close()
                    return ok({"ok": True, "removed": True})
                else:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.message_reactions (message_id, user_id, emoji)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = %s, created_at = NOW()
                    """, (msg_id, user["id"], emoji, emoji))
                    conn.commit()
                    cur.close()
                    return ok({"ok": True, "removed": False})

            if action == "forward":
                # Пересылка сообщения в тот же или другой чат
                src_msg_id = body.get("message_id")
                dst_chat_id = body.get("chat_id")
                if not src_msg_id or not dst_chat_id:
                    return err(400, "message_id и chat_id обязательны")
                cur = conn.cursor()
                # Проверяем доступ к чату-назначению
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (dst_chat_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет доступа к чату")
                # Получаем оригинальное сообщение
                cur.execute(f"""
                    SELECT text, msg_type, media_url, media_name, media_size, media_duration,
                           geo_lat, geo_lon, contact_name, contact_phone, sender_id
                    FROM {SCHEMA}.messages WHERE id = %s AND is_removed = FALSE
                """, (src_msg_id,))
                orig = cur.fetchone()
                if not orig:
                    cur.close()
                    return err(404, "Исходное сообщение не найдено")
                # Вставляем копию в чат назначения
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.messages
                      (chat_id, sender_id, text, status, msg_type, media_url, media_name,
                       media_size, media_duration, geo_lat, geo_lon, contact_name, contact_phone,
                       forwarded_from_id)
                    VALUES (%s, %s, %s, 'sent', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (dst_chat_id, user["id"], orig[0], orig[1], orig[2], orig[3], orig[4],
                      orig[5], orig[6], orig[7], orig[8], orig[9], orig[10]))
                row = cur.fetchone()
                conn.commit()
                cur.close()
                return ok({
                    "message": {
                        "id": row[0], "sender_id": user["id"], "text": orig[0] or "",
                        "status": "sent", "time": fmt_time(row[1]), "out": True,
                        "msg_type": orig[1] or "text", "media_url": orig[2], "media_name": orig[3],
                        "media_size": orig[4], "media_duration": orig[5],
                        "geo_lat": orig[6], "geo_lon": orig[7],
                        "contact_name": orig[8], "contact_phone": orig[9],
                        "forwarded_from_id": orig[10],
                        "reply_to_id": None, "edited_at": None, "is_removed": False, "reactions": [],
                    }
                })

            if action == "typing":
                chat_id = body.get("chat_id")
                if not chat_id:
                    return err(400, "chat_id обязателен")
                cur = conn.cursor()
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.typing_status (user_id, chat_id, typed_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (user_id, chat_id) DO UPDATE SET typed_at = NOW()
                """, (user["id"], chat_id))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            if action == "read":
                chat_id = body.get("chat_id")
                if chat_id:
                    cur = conn.cursor()
                    cur.execute(f"""
                        UPDATE {SCHEMA}.messages SET status = 'read'
                        WHERE chat_id = %s AND sender_id != %s AND status = 'sent'
                    """, (chat_id, user["id"]))
                    conn.commit()
                    cur.close()
                return ok({"ok": True})

            if action == "clear_chat":
                chat_id = body.get("chat_id")
                if not chat_id:
                    return err(400, "chat_id обязателен")
                cur = conn.cursor()
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет доступа")
                cur.execute(f"UPDATE {SCHEMA}.messages SET is_removed = TRUE, text = '' WHERE chat_id = %s", (chat_id,))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            if action == "delete_chat":
                chat_id = body.get("chat_id")
                if not chat_id:
                    return err(400, "chat_id обязателен")
                cur = conn.cursor()
                cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет доступа")
                cur.execute(f"UPDATE {SCHEMA}.messages SET is_removed = TRUE, text = '' WHERE chat_id = %s", (chat_id,))
                cur.execute(f"UPDATE {SCHEMA}.chat_members SET role = 'left' WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
                conn.commit()
                cur.close()
                return ok({"ok": True})

        return err(404, "Not found")
    finally:
        conn.close()