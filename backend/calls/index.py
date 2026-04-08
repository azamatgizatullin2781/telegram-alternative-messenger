"""
WorChat Calls API — WebRTC сигналинг для аудио/видеозвонков.
POST / {action: initiate}    — инициировать звонок (создаём room)
POST / {action: answer}      — принять звонок
POST / {action: reject}      — отклонить звонок
POST / {action: end}         — завершить звонок
POST / {action: signal}      — передать SDP/ICE сигнал
GET  /?action=incoming       — входящий звонок (polling)
GET  /?action=signals&room=X — получить сигналы для WebRTC
GET  /?action=history        — история звонков
"""
import json
import os
import secrets
import psycopg2

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

def handler(event: dict, context) -> dict:
    """WorChat Calls — WebRTC сигналинг для аудио и видеозвонков."""
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

        if method == "GET":
            action = params.get("action", "incoming")

            if action == "incoming":
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT cs.id, cs.room_id, cs.call_type, cs.status,
                           u.id, u.display_name, u.avatar_color, u.avatar_initials, u.avatar_url
                    FROM {SCHEMA}.call_sessions cs
                    JOIN {SCHEMA}.users u ON u.id = cs.caller_id
                    WHERE cs.callee_id = %s AND cs.status = 'ringing'
                      AND cs.created_at > NOW() - INTERVAL '30 seconds'
                    ORDER BY cs.created_at DESC LIMIT 1
                """, (user["id"],))
                row = cur.fetchone()
                cur.close()
                if not row:
                    return ok({"call": None})
                return ok({"call": {
                    "id": row[0], "room_id": row[1], "call_type": row[2], "status": row[3],
                    "caller": {"id": row[4], "display_name": row[5], "avatar_color": row[6],
                               "avatar_initials": row[7], "avatar_url": row[8]}
                }})

            if action == "signals":
                room_id = params.get("room")
                since_id = int(params.get("since_id", "0"))
                if not room_id:
                    return err(400, "Нет room")
                # use bot_messages table as signal store keyed by room, or use a temporary approach
                # Store signals in call_sessions description field as JSON queue
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT id, caller_id, callee_id, status
                    FROM {SCHEMA}.call_sessions WHERE room_id = %s
                """, (room_id,))
                cs = cur.fetchone()
                cur.close()
                if not cs:
                    return err(404, "Комната не найдена")
                if user["id"] not in (cs[1], cs[2]):
                    return err(403, "Нет доступа")

                # Use bot_messages as signal store (hack: bot_id = room_id, role = signal_type)
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT id, role, text, extra_data
                    FROM {SCHEMA}.bot_messages
                    WHERE bot_id = %s AND id > %s AND user_id != %s
                    ORDER BY id ASC LIMIT 20
                """, (f"call_{room_id}", since_id, user["id"]))
                rows = cur.fetchall()
                cur.close()
                signals = [{"id": r[0], "type": r[1], "data": r[3] or {}} for r in rows]
                return ok({"signals": signals, "status": cs[3]})

            if action == "history":
                cur = conn.cursor()
                cur.execute(f"""
                    SELECT cs.id, cs.room_id, cs.call_type, cs.status,
                           cs.started_at, cs.ended_at, cs.created_at,
                           caller.id, caller.display_name, caller.avatar_color, caller.avatar_initials, caller.avatar_url,
                           callee.id, callee.display_name, callee.avatar_color, callee.avatar_initials, callee.avatar_url
                    FROM {SCHEMA}.call_sessions cs
                    JOIN {SCHEMA}.users caller ON caller.id = cs.caller_id
                    JOIN {SCHEMA}.users callee ON callee.id = cs.callee_id
                    WHERE cs.caller_id = %s OR cs.callee_id = %s
                    ORDER BY cs.created_at DESC LIMIT 50
                """, (user["id"], user["id"]))
                rows = cur.fetchall()
                cur.close()
                history = [{
                    "id": r[0], "room_id": r[1], "call_type": r[2], "status": r[3],
                    "started_at": r[4].isoformat() if r[4] else None,
                    "ended_at": r[5].isoformat() if r[5] else None,
                    "created_at": r[6].isoformat(),
                    "caller": {"id": r[7], "display_name": r[8], "avatar_color": r[9],
                               "avatar_initials": r[10], "avatar_url": r[11]},
                    "callee": {"id": r[12], "display_name": r[13], "avatar_color": r[14],
                               "avatar_initials": r[15], "avatar_url": r[16]},
                    "outgoing": r[7] == user["id"],
                } for r in rows]
                return ok({"history": history})

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            action = body.get("action", "")

            if action == "initiate":
                callee_id = body.get("callee_id")
                call_type = body.get("call_type", "audio")
                if not callee_id:
                    return err(400, "Нет callee_id")
                if call_type not in ("audio", "video"):
                    return err(400, "Неверный тип звонка")

                # End any existing ringing calls for this pair
                cur = conn.cursor()
                cur.execute(f"""
                    UPDATE {SCHEMA}.call_sessions SET status = 'ended', ended_at = NOW()
                    WHERE (caller_id = %s OR callee_id = %s) AND status = 'ringing'
                """, (user["id"], user["id"]))

                room_id = secrets.token_hex(16)
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.call_sessions (room_id, caller_id, callee_id, call_type)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (room_id, user["id"], callee_id, call_type))
                call_id = cur.fetchone()[0]
                conn.commit()
                cur.close()
                return ok({"call_id": call_id, "room_id": room_id})

            if action == "answer":
                room_id = body.get("room_id")
                if not room_id:
                    return err(400, "Нет room_id")
                cur = conn.cursor()
                cur.execute(f"""
                    UPDATE {SCHEMA}.call_sessions
                    SET status = 'active', started_at = NOW()
                    WHERE room_id = %s AND callee_id = %s AND status = 'ringing'
                """, (room_id, user["id"]))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            if action == "reject":
                room_id = body.get("room_id")
                if not room_id:
                    return err(400, "Нет room_id")
                cur = conn.cursor()
                cur.execute(f"""
                    UPDATE {SCHEMA}.call_sessions
                    SET status = 'missed', ended_at = NOW()
                    WHERE room_id = %s AND callee_id = %s
                """, (room_id, user["id"]))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            if action == "end":
                room_id = body.get("room_id")
                if not room_id:
                    return err(400, "Нет room_id")
                cur = conn.cursor()
                cur.execute(f"""
                    UPDATE {SCHEMA}.call_sessions
                    SET status = 'ended', ended_at = NOW()
                    WHERE room_id = %s AND (caller_id = %s OR callee_id = %s)
                """, (room_id, user["id"], user["id"]))
                conn.commit()
                cur.close()
                return ok({"ok": True})

            if action == "signal":
                room_id = body.get("room_id")
                # Accept both "signal_type"/"signal_data" (frontend) and "type"/"data" (legacy)
                signal_type = body.get("signal_type") or body.get("type")
                data = body.get("signal_data") or body.get("data") or {}
                if not room_id or not signal_type:
                    return err(400, "Нет room_id или type")

                cur = conn.cursor()
                cur.execute(f"""
                    SELECT id FROM {SCHEMA}.call_sessions
                    WHERE room_id = %s AND (caller_id = %s OR callee_id = %s)
                """, (room_id, user["id"], user["id"]))
                if not cur.fetchone():
                    cur.close()
                    return err(404, "Комната не найдена")

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.bot_messages (user_id, bot_id, role, text, extra_data)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user["id"], f"call_{room_id}", signal_type, "", json.dumps(data)))
                conn.commit()
                cur.close()
                return ok({"ok": True})

        return err(404, "Not found")
    finally:
        conn.close()