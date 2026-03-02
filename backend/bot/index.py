"""
WorChat Bot — приветствие, подписки Standard и Premium, поддержка пользователей.
GET  /?action=history      — история сообщений с ботом
GET  /?action=subscription — текущая подписка и все планы
POST {action: send}        — отправить сообщение боту
POST {action: create_payment} — создать платёжную сессию
POST {action: confirm_payment} — подтвердить оплату (webhook/ручная проверка)
POST {action: cancel_subscription} — отменить подписку
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

# Планы: id -> {month: price, year: price_year}
PLANS = {
    "standard": {
        "id": "standard",
        "name": "Standard",
        "badge": "✦ STANDARD",
        "color": "#0ea5e9",
        "price_month": 149,
        "price_year": 1490,
        "currency": "₽",
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
            "💙 Цена: 149₽/мес или 1490₽/год (2 месяца в подарок)"
        ),
    },
    "premium": {
        "id": "premium",
        "name": "Premium",
        "badge": "⭐ PREMIUM",
        "color": "#6366f1",
        "price_month": 499,
        "price_year": 4990,
        "currency": "₽",
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
            "💎 Цена: 499₽/мес или 4990₽/год (2 месяца в подарок)"
        ),
    },
}

WELCOME_FLOW = [
    {"text": "👋 Привет! Я WorChat Bot — твой личный помощник.\n\nДобро пожаловать в самый защищённый мессенджер! 🚀"},
    {"text": "🔐 Все твои сообщения защищены сквозным шифрованием AES-512.\nДаже мы не можем их прочитать."},
    {"text": "✨ У нас есть два тарифа подписки:\n\n✦ Standard — 149₽/мес (1490₽/год)\n⭐ Premium — 499₽/мес (4990₽/год)\n\nНапиши /plans чтобы узнать подробности.\nИли /help для списка команд."},
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
        f"SELECT id, plan, status, started_at, expires_at, payment_ref FROM {SCHEMA}.subscriptions "
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
        "payment_ref": row[5],
    }


def activate_subscription(user_id, plan, period, payment_ref):
    conn = get_conn()
    cur = conn.cursor()
    interval = "1 year" if period == "year" else "1 month"
    cur.execute(
        f"UPDATE {SCHEMA}.subscriptions SET status = 'cancelled' "
        f"WHERE user_id = %s AND status = 'active'",
        (user_id,),
    )
    cur.execute(
        f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, payment_ref, expires_at) "
        f"VALUES (%s, %s, 'active', %s, NOW() + INTERVAL '{interval}') RETURNING id",
        (user_id, plan, payment_ref),
    )
    sub_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return sub_id


def bot_reply(user_id, text, display_name=""):
    t = text.strip().lower()

    if any(w in t for w in ["/plans", "/тарифы", "тарифы", "планы", "подписки"]):
        reply = (
            "📋 Тарифы WorChat:\n\n"
            "✦ Standard\n"
            "• 149₽/мес или 1490₽/год\n"
            "• Файлы до 1 ГБ, история 3 мес\n"
            "• 5 устройств, папки чатов\n\n"
            "⭐ Premium\n"
            "• 499₽/мес или 4990₽/год\n"
            "• Файлы до 10 ГБ (безлимит)\n"
            "• Бессрочная история\n"
            "• Видеозвонки HD 4K\n\n"
            "Напиши /standard или /premium для оформления."
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    if any(w in t for w in ["/standard", "standard", "стандарт", "стандартную"]):
        sub = get_subscription(user_id)
        if sub and sub["plan"] == "standard":
            reply = f"✦ У тебя уже активен Standard!\nДействует до: {sub['expires_at']}"
            save_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        plan = PLANS["standard"]
        save_msg(user_id, "bot", plan["description"], {"type": "subscription_offer", "plan": "standard"})
        return {"text": plan["description"], "type": "subscription_offer", "plan": "standard"}

    if any(w in t for w in ["/premium", "premium", "премиум", "премиум-подписку", "/subscription", "подписка", "купить", "оплатить"]):
        sub = get_subscription(user_id)
        if sub and sub["plan"] == "premium":
            reply = f"⭐ У тебя уже активен Premium!\nДействует до: {sub['expires_at']}"
            save_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        plan = PLANS["premium"]
        save_msg(user_id, "bot", plan["description"], {"type": "subscription_offer", "plan": "premium"})
        return {"text": plan["description"], "type": "subscription_offer", "plan": "premium"}

    if any(w in t for w in ["/status", "статус", "моя подписка", "мой тариф"]):
        sub = get_subscription(user_id)
        if sub:
            plan = PLANS.get(sub["plan"], {})
            reply = (
                f"{plan.get('badge', sub['plan'].upper())} Активная подписка\n\n"
                f"Тариф: {sub['plan'].title()}\n"
                f"Действует до: {sub['expires_at']}\n"
                f"Номер платежа: {sub.get('payment_ref', '—')}"
            )
        else:
            reply = "У тебя нет активной подписки.\n\nНапиши /plans для просмотра тарифов."
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    if any(w in t for w in ["/start", "начать", "привет", "hello", "hi"]):
        reply = f"👋 Привет, {display_name}!\n\nЯ WorChat Bot — твой личный помощник.\nНапиши /help для списка команд."
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    if any(w in t for w in ["/help", "помощь", "команды", "help"]):
        reply = (
            "📌 Команды WorChat Bot:\n\n"
            "/plans — тарифы подписки\n"
            "/standard — оформить Standard\n"
            "/premium — оформить Premium\n"
            "/status — моя подписка\n"
            "/help — список команд\n\n"
            "По всем вопросам: support@worchat.app"
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    reply = (
        f"Привет! Я не понял запрос «{text[:50]}».\n\n"
        "Попробуй:\n"
        "• /plans — посмотреть тарифы\n"
        "• /status — статус подписки\n"
        "• /help — все команды"
    )
    save_msg(user_id, "bot", reply)
    return {"text": reply, "type": "text"}


def handler(event: dict, context) -> dict:
    """Bot and subscriptions handler."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = event.get("headers", {}).get("X-Session-Token", "")

    if not token:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    user_id, display_name = verify_token(token)
    if not user_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

    params = event.get("queryStringParameters") or {}

    if method == "GET":
        action = params.get("action", "history")

        if action == "history":
            send_welcome(user_id)
            history = get_history(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": history})}

        if action == "subscription":
            sub = get_subscription(user_id)
            plans_list = []
            for p in PLANS.values():
                plans_list.append({
                    "id": p["id"],
                    "name": p["name"],
                    "badge": p["badge"],
                    "color": p["color"],
                    "price_month": p["price_month"],
                    "price_year": p["price_year"],
                    "currency": p["currency"],
                    "features": p["features"],
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"subscription": sub, "plans": plans_list})}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action", "send")

        if action == "send":
            text = (body.get("text") or "").strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет текста"})}
            save_msg(user_id, "user", text)
            reply = bot_reply(user_id, text, display_name)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply})}

        if action == "create_payment":
            plan_id = body.get("plan", "premium")
            period = body.get("period", "month")
            if plan_id not in PLANS or period not in ("month", "year"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверные параметры"})}
            plan = PLANS[plan_id]
            amount = plan["price_year"] if period == "year" else plan["price_month"]
            payment_ref = f"WC-{uuid.uuid4().hex[:12].upper()}"
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "payment": {
                    "ref": payment_ref,
                    "plan": plan_id,
                    "period": period,
                    "amount": amount,
                    "currency": "RUB",
                    "description": f"WorChat {plan['name']} — {'1 год' if period == 'year' else '1 месяц'}",
                }
            })}

        if action == "confirm_payment":
            plan_id = body.get("plan", "premium")
            period = body.get("period", "month")
            payment_ref = body.get("payment_ref", f"WC-{uuid.uuid4().hex[:12].upper()}")
            if plan_id not in PLANS:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный план"})}
            sub_id = activate_subscription(user_id, plan_id, period, payment_ref)
            plan = PLANS[plan_id]
            amount = plan["price_year"] if period == "year" else plan["price_month"]
            period_label = "1 год" if period == "year" else "1 месяц"
            confirm_text = (
                f"{plan['badge']} Подписка {plan['name']} оформлена!\n\n"
                f"Период: {period_label}\n"
                f"Сумма: {amount}₽\n"
                f"Номер платежа: {payment_ref}\n\n"
                f"Спасибо за доверие! 🎉"
            )
            save_msg(user_id, "bot", confirm_text)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "sub_id": sub_id, "message": confirm_text, "payment_ref": payment_ref
            })}

        if action == "cancel_subscription":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.subscriptions SET status = 'cancelled' "
                f"WHERE user_id = %s AND status = 'active'",
                (user_id,),
            )
            conn.commit()
            conn.close()
            reply = "Подписка отменена. Жаль расставаться! 😢\n\nНапиши /plans чтобы снова подписаться."
            save_msg(user_id, "bot", reply)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"cancelled": True, "message": reply})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
