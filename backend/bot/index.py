import os
import json
import psycopg2
from datetime import datetime

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

SUBSCRIPTION_PLANS = {
    "stellar": {
        "name": "Stellar",
        "price": 299,
        "currency": "₽",
        "period": "месяц",
        "badge": "⭐ STELLAR",
        "color": "#6366f1",
        "features": [
            "Безлимитные файлы до 10 ГБ",
            "Эксклюзивный статус ⭐ Stellar",
            "Кастомные темы и анимированные аватары",
            "Приоритетная доставка сообщений",
            "Голосовые и видеозвонки HD 4K",
            "Уникальный юзернейм @premium.***",
            "Шифрование военного уровня (AES-512)",
            "Папки и фильтры чатов без ограничений",
            "Реакции любыми эмодзи",
            "Ранний доступ к новым функциям",
        ],
    }
}

WELCOME_FLOW = [
    {
        "delay": 0,
        "text": "👋 Привет! Я **WorChat Bot** — твой личный помощник.\n\nДобро пожаловать в самый защищённый мессенджер! 🚀",
    },
    {
        "delay": 1,
        "text": "🔐 Все твои сообщения защищены сквозным шифрованием AES-512. Даже мы не можем их прочитать.",
    },
    {
        "delay": 2,
        "text": "✨ Хочешь узнать о **WorChat Stellar** — нашей премиум-подписке, которая делает общение совсем другим уровнем?\n\nНапиши /subscription или просто «подписка».",
    },
]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def verify_token(token):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s AND expires_at > NOW()",
        (token,),
    )
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def get_bot_history(user_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, role, text, extra_data, created_at FROM {SCHEMA}.bot_messages WHERE user_id = %s AND bot_id = 'worchat_bot' ORDER BY created_at ASC LIMIT 100",
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    result = []
    for r in rows:
        extra = r[3] or {}
        result.append({
            "id": r[0],
            "role": r[1],
            "text": r[2],
            "extra": extra,
            "time": r[4].strftime("%H:%M"),
        })
    return result


def save_bot_msg(user_id, role, text, extra=None):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.bot_messages (user_id, bot_id, role, text, extra_data) VALUES (%s, 'worchat_bot', %s, %s, %s) RETURNING id",
        (user_id, role, text, json.dumps(extra) if extra else None),
    )
    msg_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return msg_id


def send_welcome(user_id, display_name):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.bot_messages WHERE user_id = %s", (user_id,))
    count = cur.fetchone()[0]
    conn.close()
    if count > 0:
        return
    for msg in WELCOME_FLOW:
        text = msg["text"].replace("**", "").replace("*", "")
        save_bot_msg(user_id, "bot", text)


def get_subscription(user_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, plan, status, started_at, expires_at FROM {SCHEMA}.subscriptions WHERE user_id = %s AND status = 'active' AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row[0],
        "plan": row[1],
        "status": row[2],
        "started_at": row[3].strftime("%d.%m.%Y"),
        "expires_at": row[4].strftime("%d.%m.%Y"),
    }


def activate_subscription(user_id, plan, payment_ref):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, payment_ref) VALUES (%s, %s, 'active', %s) RETURNING id",
        (user_id, plan, payment_ref),
    )
    sub_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return sub_id


def bot_reply(user_id, user_text):
    """Логика ответов бота на сообщения пользователя."""
    t = user_text.strip().lower()
    
    if any(w in t for w in ["/subscription", "подписка", "premium", "stellar", "купить", "оплатить"]):
        sub = get_subscription(user_id)
        if sub:
            reply = f"⭐ У тебя уже активна подписка Stellar!\n\nДействует до: {sub['expires_at']}\n\nСпасибо, что с нами! 🚀"
            save_bot_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        else:
            plan = SUBSCRIPTION_PLANS["stellar"]
            reply = f"✨ WorChat Stellar — это не просто премиум.\n\nЭто другой уровень:\n\n" + "\n".join([f"• {f}" for f in plan["features"]]) + f"\n\n💎 Цена: {plan['price']}{plan['currency']}/{plan['period']}"
            save_bot_msg(user_id, "bot", reply, {"type": "subscription_offer", "plan": "stellar"})
            return {"text": reply, "type": "subscription_offer", "plan": SUBSCRIPTION_PLANS["stellar"]}

    if any(w in t for w in ["/start", "привет", "hello", "hi", "начать"]):
        reply = "👋 Привет снова! Я здесь, чтобы помочь.\n\nНапиши /subscription чтобы узнать о Stellar подписке, или просто пообщайся со мной!"
        save_bot_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    if any(w in t for w in ["/help", "помощь", "помоги", "команды"]):
        reply = "🤖 Что я умею:\n\n/subscription — узнать о Stellar подписке\n/start — приветствие\n/help — список команд\n\nИли просто напиши что-нибудь!"
        save_bot_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    reply = f"Получил твоё сообщение: «{user_text[:50]}»\n\nЯ пока учусь, но уже скоро смогу на всё ответить 🤖\n\nПопробуй /subscription или /help"
    save_bot_msg(user_id, "bot", reply)
    return {"text": reply, "type": "text"}


def handler(event: dict, context) -> dict:
    """Бот WorChat — приветствие новых пользователей и оформление Stellar подписки."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    user_id = verify_token(token)
    if not user_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Unauthorized"})}

    method = event.get("httpMethod", "GET")
    
    if method == "GET":
        action = (event.get("queryStringParameters") or {}).get("action", "history")
        
        if action == "history":
            send_welcome(user_id, "")
            history = get_bot_history(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": history})}
        
        if action == "subscription":
            sub = get_subscription(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"subscription": sub, "plans": SUBSCRIPTION_PLANS})}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "send":
            text = body.get("text", "").strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Empty message"})}
            save_bot_msg(user_id, "user", text)
            reply_data = bot_reply(user_id, text)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply_data})}

        if action == "pay_subscription":
            plan = body.get("plan", "stellar")
            if plan not in SUBSCRIPTION_PLANS:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown plan"})}
            sub = get_subscription(user_id)
            if sub:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"status": "already_active", "subscription": sub})}
            import uuid
            ref = f"WC-{uuid.uuid4().hex[:12].upper()}"
            sub_id = activate_subscription(user_id, plan, ref)
            save_bot_msg(user_id, "bot", f"🎉 Поздравляю! Stellar подписка активирована!\n\nНомер платежа: {ref}\nДействует 30 дней. Добро пожаловать в клуб ⭐", {"type": "subscription_activated", "ref": ref})
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"status": "activated", "ref": ref, "plan": plan})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
