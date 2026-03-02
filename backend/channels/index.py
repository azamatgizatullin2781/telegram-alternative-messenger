"""
WorChat Channels API — создание, просмотр, публикация постов в каналах.
GET  /?action=list           — список всех каналов
GET  /?action=my             — мои каналы (где я owner/admin)
GET  /?action=posts&id=X     — посты канала
POST / {action: create}      — создать канал
POST / {action: subscribe}   — подписаться на канал
POST / {action: post}        — опубликовать пост в канал
POST / {action: update}      — обновить описание/название канала
"""
import json
import os
import psycopg2
import re

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_token(conn, token):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url
        FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {"id": row[0], "display_name": row[1], "avatar_color": row[2], "avatar_initials": row[3], "avatar_url": row[4]}

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}

def err(code, msg):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def make_slug(name):
    slug = re.sub(r"[^a-z0-9а-яёa-z ]", "", name.lower())
    slug = re.sub(r"\s+", "_", slug.strip())
    return slug[:40]

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = event.get("headers", {}).get("X-Session-Token", "")

    if not token:
        return err(401, "Не авторизован")

    conn = get_conn()
    try:
        user = verify_token(conn, token)
        if not user:
            return err(401, "Сессия истекла")

        params = event.get("queryStringParameters") or {}
        action = params.get("action", "list")

        if method == "GET":
            if action == "list":
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT c.id, c.name, c.description, c.avatar_color, c.avatar_url,
                           c.members_count, c.is_public, c.slug,
                           EXISTS(SELECT 1 FROM {SCHEMA}.channel_members cm
                                  WHERE cm.channel_id = c.id AND cm.user_id = %s) as subscribed,
                           c.owner_id
                    FROM {SCHEMA}.chats c
                    WHERE c.type = 'channel'
                    ORDER BY c.members_count DESC, c.id DESC
                    LIMIT 50
                """, (user["id"],))
                rows = cur.fetchall()
                cur.close()
                channels = [{"id": r[0], "name": r[1], "description": r[2], "avatar_color": r[3],
                             "avatar_url": r[4], "members_count": r[5], "is_public": r[6],
                             "slug": r[7], "subscribed": r[8], "owner_id": r[9]} for r in rows]
                return ok({"channels": channels})

            if action == "my":
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT c.id, c.name, c.description, c.avatar_color, c.avatar_url,
                           c.members_count, c.is_public, c.slug, cm.role, c.owner_id
                    FROM {SCHEMA}.chats c
                    JOIN {SCHEMA}.channel_members cm ON cm.channel_id = c.id
                    WHERE c.type = 'channel' AND cm.user_id = %s AND cm.role IN ('owner','admin')
                    ORDER BY c.id DESC
                """, (user["id"],))
                rows = cur.fetchall()
                cur.close()
                channels = [{"id": r[0], "name": r[1], "description": r[2], "avatar_color": r[3],
                             "avatar_url": r[4], "members_count": r[5], "is_public": r[6],
                             "slug": r[7], "role": r[8], "owner_id": r[9]} for r in rows]
                return ok({"channels": channels})

            if action == "posts":
                channel_id = params.get("id")
                if not channel_id:
                    return err(400, "Нет id канала")
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT cp.id, cp.text, cp.msg_type, cp.media_url, cp.media_name, cp.views,
                           to_char(cp.created_at AT TIME ZONE 'Europe/Moscow','DD.MM.YYYY HH24:MI') as ts,
                           u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url
                    FROM {SCHEMA}.channel_posts cp
                    JOIN {SCHEMA}.users u ON u.id = cp.sender_id
                    WHERE cp.chat_id = %s
                    ORDER BY cp.created_at DESC
                    LIMIT 50
                """, (int(channel_id),))
                rows = cur.fetchall()
                # increment views
                if rows:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.channel_posts SET views = views + 1
                        WHERE chat_id = %s
                    """, (int(channel_id),))
                    conn.commit()
                cur.close()
                posts = [{
                    "id": r[0], "text": r[1], "msg_type": r[2], "media_url": r[3],
                    "media_name": r[4], "views": r[5], "ts": r[6],
                    "author": {"display_name": r[7], "avatar_color": r[8],
                               "avatar_initials": r[9], "avatar_url": r[10]}
                } for r in rows]
                return ok({"posts": posts})

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            action = body.get("action", "")

            if action == "create":
                name = (body.get("name") or "").strip()
                description = (body.get("description") or "").strip()
                is_public = bool(body.get("is_public", True))

                if not name or len(name) < 2:
                    return err(400, "Название канала минимум 2 символа")

                slug = make_slug(name)
                import random
                colors = ["#4F86C6","#5BA87A","#C47DB5","#D4885A","#5966C0","#B5574A"]
                color = random.choice(colors)

                cur = conn.cursor()
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chats (type, name, description, owner_id, members_count, is_public, avatar_color, slug)
                    VALUES ('channel', %s, %s, %s, 1, %s, %s, %s)
                    RETURNING id
                """, (name, description, user["id"], is_public, color, slug))
                channel_id = cur.fetchone()[0]

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.channel_members (channel_id, user_id, role)
                    VALUES (%s, %s, 'owner')
                """, (channel_id, user["id"]))
                conn.commit()
                cur.close()

                return ok({
                    "channel": {
                        "id": channel_id, "name": name, "description": description,
                        "avatar_color": color, "members_count": 1,
                        "is_public": is_public, "slug": slug, "owner_id": user["id"],
                        "role": "owner", "subscribed": True
                    }
                })

            if action == "subscribe":
                channel_id = body.get("channel_id")
                if not channel_id:
                    return err(400, "Нет channel_id")

                cur = conn.cursor()
                cur.execute(f"""
                    SELECT id FROM {SCHEMA}.chats WHERE id = %s AND type = 'channel'
                """, (channel_id,))
                if not cur.fetchone():
                    cur.close()
                    return err(404, "Канал не найден")

                cur.execute(f"""
                    SELECT role FROM {SCHEMA}.channel_members WHERE channel_id = %s AND user_id = %s
                """, (channel_id, user["id"]))
                existing = cur.fetchone()

                if existing:
                    if existing[0] == 'owner':
                        cur.close()
                        return err(400, "Владелец не может отписаться")
                    cur.execute(f"""
                        UPDATE {SCHEMA}.chats SET members_count = GREATEST(0, members_count - 1)
                        WHERE id = %s
                    """, (channel_id,))
                    cur.execute(f"""
                        UPDATE {SCHEMA}.channel_members SET role = 'unsubscribed'
                        WHERE channel_id = %s AND user_id = %s
                    """, (channel_id, user["id"]))
                    conn.commit()
                    cur.close()
                    return ok({"subscribed": False})
                else:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.channel_members (channel_id, user_id, role)
                        VALUES (%s, %s, 'subscriber')
                        ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'subscriber'
                    """, (channel_id, user["id"]))
                    cur.execute(f"""
                        UPDATE {SCHEMA}.chats SET members_count = members_count + 1
                        WHERE id = %s
                    """, (channel_id,))
                    conn.commit()
                    cur.close()
                    return ok({"subscribed": True})

            if action == "post":
                channel_id = body.get("channel_id")
                text = (body.get("text") or "").strip()
                msg_type = body.get("msg_type", "text")
                media_url = body.get("media_url")
                media_name = body.get("media_name")

                if not channel_id:
                    return err(400, "Нет channel_id")
                if not text and not media_url:
                    return err(400, "Нет контента")

                cur = conn.cursor()
                cur.execute(f"""
                    SELECT role FROM {SCHEMA}.channel_members
                    WHERE channel_id = %s AND user_id = %s AND role IN ('owner','admin')
                """, (channel_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет прав на публикацию")

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.channel_posts (chat_id, sender_id, text, msg_type, media_url, media_name)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, to_char(created_at AT TIME ZONE 'Europe/Moscow','DD.MM.YYYY HH24:MI')
                """, (channel_id, user["id"], text, msg_type, media_url, media_name))
                row = cur.fetchone()
                conn.commit()
                cur.close()

                return ok({"post": {
                    "id": row[0], "text": text, "msg_type": msg_type,
                    "media_url": media_url, "media_name": media_name, "views": 0, "ts": row[1],
                    "author": {"display_name": user["display_name"], "avatar_color": user["avatar_color"],
                               "avatar_initials": user["avatar_initials"], "avatar_url": user["avatar_url"]}
                }})

            if action == "update":
                channel_id = body.get("channel_id")
                if not channel_id:
                    return err(400, "Нет channel_id")

                cur = conn.cursor()
                cur.execute(f"""
                    SELECT role FROM {SCHEMA}.channel_members
                    WHERE channel_id = %s AND user_id = %s AND role IN ('owner','admin')
                """, (channel_id, user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(403, "Нет прав")

                fields, values = [], []
                if body.get("name"):
                    fields.append("name = %s")
                    values.append(body["name"].strip())
                if "description" in body:
                    fields.append("description = %s")
                    values.append(body["description"])
                if "avatar_url" in body:
                    fields.append("avatar_url = %s")
                    values.append(body["avatar_url"])

                if fields:
                    values.append(channel_id)
                    cur.execute(f"""
                        UPDATE {SCHEMA}.chats SET {', '.join(fields)} WHERE id = %s
                        RETURNING id, name, description, avatar_color, avatar_url, members_count, is_public, slug, owner_id
                    """, values)
                    r = cur.fetchone()
                    conn.commit()
                    cur.close()
                    return ok({"channel": {"id": r[0], "name": r[1], "description": r[2],
                                          "avatar_color": r[3], "avatar_url": r[4],
                                          "members_count": r[5], "is_public": r[6],
                                          "slug": r[7], "owner_id": r[8]}})
                cur.close()
                return ok({"ok": True})

        return err(404, "Not found")
    finally:
        conn.close()
