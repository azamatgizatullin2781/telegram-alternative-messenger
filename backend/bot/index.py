"""
WorChat Bot — приветствие, подписки Standard и Premium, поддержка пользователей.
GET  /?action=history      — история сообщений с ботом
GET  /?action=subscription — текущая подписка и планы
POST {action: send}        — отправить сообщение боту
POST {action: pay_subscription, plan: standard|premium} — оформить подписку
"""
import os
import json
import uuid
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

PLANS = {
    "standard": {
        "id": "standard",
        "name": "Standard",
        "price": 149,
        "currency": "₽",
        "period": "месяц",
        "badge": "✦ STANDARD",
        "color": "#0ea5e9",
        "features": [
            "Файлы до 1 ГБ",
            "История сообщений 3 месяца",
            "Статус ✦ Standard",
            "До 5 активных устройств",
            "Папки чатов (до 5 штук)",
            "Реакции на сообщения",
            "Приоритетная поддержка",
            "Отключение рекламы",
        ],
        "description": (
            "✦ WorChat Standard — старт нового уровня общения!\n\n"
            "• 📁 Файлы до 1 ГБ каждый\n"
            "• 🗂 История сообщений 3 месяца\n"
            "• ✦ Статус Standard в профиле\n"
            "• 📱 До 5 активных устройств\n"
            "• 📂 Папки и фильтры чатов\n"
            "• 👍 Реакции на сообщения\n"
            "• 🎧 Приоритетная поддержка\n"
            "• 🚫 Без рекламы\n\n"
            "💙 Цена: 149₽/месяц"
        ),
    },
    "premium": {
        "id": "premium",
        "name": "Premium",
        "price": 499,
        "currency": "₽",
        "period": "месяц",
        "badge": "⭐ PREMIUM",
        "color": "#6366f1",
        "features": [
            "Безлимитные файлы до 10 ГБ",
            "Бессрочная история сообщений",
            "Эксклюзивный статус ⭐ Premium",
            "Безлимитные устройства",
            "Кастомные темы оформления",
            "Анимированные аватары",
            "Уникальный @username.premium",
            "Голосовые и видеозвонки HD 4K",
            "Папки чатов без ограничений",
            "Реакции любыми эмодзи",
            "Шифрование военного уровня AES-512",
            "Ранний доступ к новым функциям",
            "Персональный менеджер поддержки",
            "Эксклюзивные стикеры и темы",
        ],
        "description": (
            "⭐ WorChat Premium — максимум возможностей!\n\n"
            "• 📦 Файлы до 10 ГБ (безлимит)\n"
            "• ♾ Бессрочная история сообщений\n"
            "• ⭐ Статус Premium + анимированный аватар\n"
            "• 📱 Безлимитные устройства\n"
            "• 🎨 Кастомные темы оформления\n"
            "• 🏷 Уникальный @username.premium\n"
            "• 📹 Видеозвонки HD 4K\n"
            "• 📂 Папки чатов без ограничений\n"
            "• 🎭 Реакции любыми эмодзи\n"
            "• 🔐 Шифрование AES-512\n"
            "• 🚀 Ранний доступ к функциям\n"
            "• 👤 Персональный менеджер\n\n"
            "💎 Цена: 499₽/месяц"
        ),
    },
}

WELCOME_FLOW = [
    {
        "text": (
            "👋 Привет! Я WorChat Bot — твой личный помощник.\n\n"
            "Добро пожаловать в самый защищённый мессенджер! 🚀"
        )
    },
    {
        "text": (
            "🔐 Все твои сообщения защищены сквозным шифрованием AES-512.\n"
            "Даже мы не можем их прочитать."
        )
    },
    {
        "text": (
            "✨ У нас есть два тарифа подписки:\n\n"
            "✦ Standard — 149₽/мес\n"
            "⭐ Premium — 499₽/мес\n\n"
            "Напиши /plans чтобы узнать подробности.\n"
            "Или /help для списка команд."
        )
    },
]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def verify_token(token):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.display_name FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = %s AND s.expires_at > NOW()",
        (token,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return None, None
    return row[0], row[1]


def get_history(user_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, role, text, extra_data, created_at FROM {SCHEMA}.bot_messages "
        f"WHERE user_id = %s AND bot_id = 'worchat_bot' ORDER BY created_at ASC LIMIT 100",
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    result = []
    for r in rows:
        extra = r[3] or {}
        result.append({
            "id": r[0], "role": r[1], "text": r[2],
            "extra": extra, "time": r[4].strftime("%H:%M"),
        })
    return result


def save_msg(user_id, role, text, extra=None):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.bot_messages (user_id, bot_id, role, text, extra_data) "
        f"VALUES (%s, 'worchat_bot', %s, %s, %s) RETURNING id",
        (user_id, role, text, json.dumps(extra) if extra else None),
    )
    msg_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return msg_id


def send_welcome(user_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.bot_messages WHERE user_id = %s", (user_id,))
    count = cur.fetchone()[0]
    conn.close()
    if count > 0:
        return
    for msg in WELCOME_FLOW:
        save_msg(user_id, "bot", msg["text"])


def get_subscription(user_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, plan, status, started_at, expires_at FROM {SCHEMA}.subscriptions "
        f"WHERE user_id = %s AND status = 'active' AND expires_at > NOW() "
        f"ORDER BY expires_at DESC LIMIT 1",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row[0], "plan": row[1], "status": row[2],
        "started_at": row[3].strftime("%d.%m.%Y"),
        "expires_at": row[4].strftime("%d.%m.%Y"),
    }


def activate_subscription(user_id, plan, payment_ref):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, payment_ref) "
        f"VALUES (%s, %s, 'active', %s) RETURNING id",
        (user_id, plan, payment_ref),
    )
    sub_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return sub_id


def bot_reply(user_id, text, display_name=""):
    t = text.strip().lower()

    # /plans — показать оба тарифа
    if any(w in t for w in ["/plans", "/тарифы", "тарифы", "планы", "подписки"]):
        reply = (
            "📋 Тарифы WorChat:\n\n"
            "✦ Standard — 149₽/мес\n"
            "• Файлы до 1 ГБ, история 3 мес\n"
            "• 5 устройств, папки чатов\n"
            "• Реакции, статус Standard\n\n"
            "⭐ Premium — 499₽/мес\n"
            "• Файлы до 10 ГБ (безлимит)\n"
            "• Бессрочная история\n"
            "• Видеозвонки HD 4K\n"
            "• Кастомные темы, анимированные аватары\n"
            "• @username.premium\n\n"
            "Напиши /standard или /premium для оформления."
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    # Standard
    if any(w in t for w in ["/standard", "standard", "стандарт", "стандартную"]):
        sub = get_subscription(user_id)
        if sub:
            reply = f"✦ У тебя уже активна подписка {sub['plan'].title()}!\nДействует до: {sub['expires_at']}"
            save_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        plan = PLANS["standard"]
        save_msg(user_id, "bot", plan["description"], {"type": "subscription_offer", "plan": "standard"})
        return {"text": plan["description"], "type": "subscription_offer", "plan": "standard"}

    # Premium
    if any(w in t for w in ["/premium", "premium", "премиум", "премиум-подписку", "/subscription", "подписка", "купить", "оплатить", "stellar"]):
        sub = get_subscription(user_id)
        if sub and sub["plan"] == "premium":
            reply = f"⭐ У тебя уже активна Premium подписка!\nДействует до: {sub['expires_at']}\n\nСпасибо, что с нами! 🚀"
            save_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        plan = PLANS["premium"]
        save_msg(user_id, "bot", plan["description"], {"type": "subscription_offer", "plan": "premium"})
        return {"text": plan["description"], "type": "subscription_offer", "plan": "premium"}

    # Статус подписки
    if any(w in t for w in ["/status", "/mysub", "моя подписка", "мой тариф"]):
        sub = get_subscription(user_id)
        if sub:
            plan_info = PLANS.get(sub["plan"], {})
            reply = (
                f"{'⭐' if sub['plan'] == 'premium' else '✦'} Твоя подписка: {sub['plan'].title()}\n\n"
                f"Активна с: {sub['started_at']}\n"
                f"Действует до: {sub['expires_at']}\n\n"
                f"Цена: {plan_info.get('price', '?')}₽/мес"
            )
        else:
            reply = (
                "У тебя нет активной подписки.\n\n"
                "Напиши /plans чтобы посмотреть тарифы,\n"
                "или /standard и /premium для оформления."
            )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    # /start, привет
    if any(w in t for w in ["/start", "привет", "hello", "hi", "начать", "старт"]):
        name = display_name.split()[0] if display_name else "друг"
        reply = (
            f"👋 Привет, {name}!\n\n"
            "Я здесь, чтобы помочь. Что тебя интересует?\n\n"
            "• /plans — тарифы подписки\n"
            "• /standard — Standard за 149₽/мес\n"
            "• /premium — Premium за 499₽/мес\n"
            "• /status — статус твоей подписки\n"
            "• /help — все команды"
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    # /help
    if any(w in t for w in ["/help", "помощь", "помоги", "команды"]):
        reply = (
            "🤖 Команды WorChat Bot:\n\n"
            "/plans — все тарифы подписки\n"
            "/standard — оформить Standard (149₽)\n"
            "/premium — оформить Premium (499₽)\n"
            "/status — статус твоей подписки\n"
            "/start — приветствие\n"
            "/help — этот список\n\n"
            "Или просто напиши что-нибудь!"
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    # Дефолт
    reply = (
        f"Понял, записал: «{text[:60]}{'...' if len(text) > 60 else ''}» 🤖\n\n"
        "Попробуй /plans, /standard, /premium или /help."
    )
    save_msg(user_id, "bot", reply)
    return {"text": reply, "type": "text"}


def handler(event: dict, context) -> dict:
    """WorChat Bot — подписки Standard/Premium, приветствие, поддержка."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    user_id, display_name = verify_token(token)
    if not user_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Unauthorized"})}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        action = (event.get("queryStringParameters") or {}).get("action", "history")

        if action == "history":
            send_welcome(user_id)
            history = get_history(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": history})}

        if action == "subscription":
            sub = get_subscription(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"subscription": sub, "plans": PLANS})}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action", "")

        if action == "send":
            text = body.get("text", "").strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Empty"})}
            save_msg(user_id, "user", text)
            reply_data = bot_reply(user_id, text, display_name or "")
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply_data})}

        if action == "pay_subscription":
            plan_id = body.get("plan", "premium")
            if plan_id not in PLANS:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown plan"})}
            sub = get_subscription(user_id)
            if sub and sub["plan"] == plan_id:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"status": "already_active", "subscription": sub})}
            ref = f"WC-{uuid.uuid4().hex[:12].upper()}"
            activate_subscription(user_id, plan_id, ref)
            plan = PLANS[plan_id]
            confirm = (
                f"{'⭐' if plan_id == 'premium' else '✦'} Поздравляю! "
                f"Подписка {plan['name']} активирована!\n\n"
                f"Номер платежа: {ref}\n"
                f"Сумма: {plan['price']}{plan['currency']}/{plan['period']}\n\n"
                f"Спасибо за поддержку WorChat! 🚀"
            )
            save_msg(user_id, "bot", confirm)
            new_sub = get_subscription(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"status": "activated", "subscription": new_sub})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Bad request"})}
