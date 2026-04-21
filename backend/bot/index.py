"""
WorChat Bot — живой ИИ-ассистент на GPT-4o-mini + система подписок.
GET  /?action=history      — история сообщений с ботом
GET  /?action=subscription — текущая подписка и все планы
POST {action: send}        — отправить сообщение боту (ИИ отвечает)
POST {action: create_payment}   — создать платёжную сессию
POST {action: confirm_payment}  — подтвердить оплату
POST {action: cancel_subscription} — отменить подписку
"""
import os
import json
import uuid
import psycopg2
import urllib.request
import urllib.error

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

PLANS = {
    "worchat": {
        "id": "worchat",
        "name": "WorChat",
        "badge": "⭐ WORCHAT",
        "color": "#6366f1",
        "price_month": 99,
        "price_year": 999,
        "currency": "₽",
        "features": [
            "Файлы до 5 ГБ каждый",
            "Бессрочная история сообщений",
            "Значок ⭐ WorChat в профиле",
            "Голосовые и видеозвонки HD",
            "Истории (Stories)",
            "Кастомные темы оформления",
            "Реакции любыми эмодзи",
            "Приоритетная поддержка 24/7",
            "Блокировка пользователей",
            "Ранний доступ к функциям",
        ],
        "description": (
            "⭐ WorChat — всё лучшее в одной подписке!\n\n"
            "• 📦 Файлы до 5 ГБ каждый\n"
            "• ♾ Бессрочная история сообщений\n"
            "• ⭐ Значок WorChat в профиле\n"
            "• 📹 Видеозвонки HD качества\n"
            "• 📸 Истории (Stories) 24 часа\n"
            "• 🎨 Кастомные темы оформления\n"
            "• 🎭 Реакции любыми эмодзи\n"
            "• 🎧 Приоритетная поддержка 24/7\n"
            "• 🚀 Ранний доступ к функциям\n\n"
            "💎 Цена: 99₽/мес или 999₽/год (2 месяца в подарок)"
        ),
    },
    "standard": {
        "id": "standard",
        "name": "Standard",
        "badge": "✦ STANDARD",
        "color": "#0ea5e9",
        "price_month": 99,
        "price_year": 999,
        "currency": "₽",
        "features": [
            "Файлы до 5 ГБ",
            "Бессрочная история",
            "Значок ✦ Standard",
            "Истории (Stories)",
            "Реакции на сообщения",
            "Приоритетная поддержка",
        ],
        "description": (
            "✦ WorChat Standard — всё необходимое!\n\n"
            "• 📁 Файлы до 5 ГБ каждый\n"
            "• ♾ Бессрочная история сообщений\n"
            "• ✦ Значок Standard в профиле\n"
            "• 📸 Истории (Stories)\n"
            "• 👍 Реакции на сообщения\n"
            "• 🎧 Приоритетная поддержка\n\n"
            "💙 Цена: 99₽/мес или 999₽/год"
        ),
    },
    "premium": {
        "id": "premium",
        "name": "Premium",
        "badge": "⭐ PREMIUM",
        "color": "#6366f1",
        "price_month": 99,
        "price_year": 999,
        "currency": "₽",
        "features": [
            "Файлы до 5 ГБ",
            "Бессрочная история сообщений",
            "Эксклюзивный значок ⭐ Premium",
            "Кастомные темы оформления",
            "Истории (Stories) 24 часа",
            "Реакции любыми эмодзи",
            "Ранний доступ к новым функциям",
            "Персональный менеджер поддержки",
        ],
        "description": (
            "⭐ WorChat Premium — максимум возможностей!\n\n"
            "• 📦 Файлы до 5 ГБ\n"
            "• ♾ Бессрочная история сообщений\n"
            "• ⭐ Значок Premium в профиле\n"
            "• 🎨 Кастомные темы оформления\n"
            "• 📸 Истории (Stories)\n"
            "• 🎭 Реакции любыми эмодзи\n"
            "• 🚀 Ранний доступ к функциям\n"
            "• 👤 Персональный менеджер\n\n"
            "💎 Цена: 99₽/мес или 999₽/год"
        ),
    },
}

SYSTEM_PROMPT = """Ты WorChat Bot — живой, дружелюбный ИИ-ассистент внутри мессенджера WorChat.
Ты умный, полезный, с характером. Отвечай кратко и по делу (2–5 предложений обычно достаточно).
Используй эмодзи умеренно. Пиши по-русски, если пользователь пишет по-русски.

О WorChat:
- Это защищённый мессенджер с шифрованием E2E
- Подписка WorChat: 99₽/мес или 999₽/год (2 месяца в подарок)
- С подпиской: файлы до 5 ГБ, бессрочная история, HD-звонки, истории (Stories), кастомные темы, значок ⭐ в профиле
- Без подписки: базовые функции чата, файлы до 50 МБ

Команды которые ты понимаешь:
/plans — тарифы, /worchat — оформить WorChat подписку, /status — статус подписки, /help — список команд

Если пользователь хочет оформить подписку — скажи что нужно написать /worchat.
Можешь помогать с вопросами, советами, разговорами на любую тему — ты умный ассистент!
"""


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


def send_welcome(user_id, display_name):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.bot_messages WHERE user_id = %s", (user_id,))
    count = cur.fetchone()[0]
    conn.close()
    if count > 0:
        return
    welcome = (
        f"👋 Привет, {display_name}! Я WorChat Bot — умный помощник на базе ИИ.\n\n"
        "Я могу помочь с любыми вопросами, поддержать разговор и рассказать о возможностях WorChat.\n\n"
        "✨ Попробуй написать мне что угодно — я живой! Или введи /help для команд."
    )
    save_msg(user_id, "bot", welcome)


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


def get_recent_history_for_ai(user_id, limit=20):
    """Берём последние N сообщений для контекста ИИ."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT role, text FROM {SCHEMA}.bot_messages "
        f"WHERE user_id = %s AND bot_id = 'worchat_bot' "
        f"ORDER BY created_at DESC LIMIT %s",
        (user_id, limit),
    )
    rows = cur.fetchall()
    conn.close()
    # Переворачиваем — нужен хронологический порядок
    return list(reversed(rows))


def ask_openai(user_id, user_text, display_name):
    """Отправляем запрос к GPT-4o-mini через urllib (без сторонних библиотек)."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None

    # Собираем историю диалога для контекста
    history = get_recent_history_for_ai(user_id, limit=20)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for role, text in history:
        # role в БД: "user" или "bot" — конвертируем в OpenAI формат
        openai_role = "assistant" if role == "bot" else "user"
        messages.append({"role": openai_role, "content": text})

    # Добавляем текущее сообщение пользователя
    messages.append({"role": "user", "content": user_text})

    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": messages,
        "max_tokens": 500,
        "temperature": 0.8,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def handle_command(user_id, text, display_name):
    """Обработка специальных команд (/plans, /standard, /premium, /status, /help)."""
    t = text.strip().lower()

    if any(w in t for w in ["/plans", "/тарифы", "/подписки"]):
        reply = (
            "📋 Подписка WorChat:\n\n"
            "⭐ WorChat — 99₽/мес или 999₽/год\n"
            "• Файлы до 5 ГБ\n"
            "• Бессрочная история\n"
            "• HD видеозвонки\n"
            "• Истории (Stories)\n"
            "• Кастомные темы\n"
            "• Значок ⭐ в профиле\n\n"
            "Напиши /worchat для оформления подписки."
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    if t in ["/worchat", "/standard", "/premium"] or t in ["worchat", "standard", "premium"]:
        sub = get_subscription(user_id)
        if sub:
            reply = f"⭐ У тебя уже активна подписка WorChat!\nДействует до: {sub['expires_at']}"
            save_msg(user_id, "bot", reply)
            return {"text": reply, "type": "text"}
        plan = PLANS["worchat"]
        save_msg(user_id, "bot", plan["description"], {"type": "subscription_offer", "plan": "worchat"})
        return {"text": plan["description"], "type": "subscription_offer", "plan": "worchat"}

    if any(w in t for w in ["/status", "/моя подписка"]):
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

    if any(w in t for w in ["/help", "/start", "/старт"]):
        reply = (
            f"👋 Привет, {display_name}!\n\n"
            "Я умный ИИ-ассистент WorChat. Могу:\n"
            "• Ответить на любой вопрос\n"
            "• Помочь с задачами\n"
            "• Поддержать разговор\n\n"
            "📌 Команды:\n"
            "/plans — подписка WorChat\n"
            "/worchat — оформить подписку\n"
            "/status — моя подписка\n\n"
            "Просто напиши мне что угодно! 🚀"
        )
        save_msg(user_id, "bot", reply)
        return {"text": reply, "type": "text"}

    return None


def handler(event: dict, context) -> dict:
    """Bot handler с живым ИИ на GPT-4o-mini."""
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
            send_welcome(user_id, display_name)
            history = get_history(user_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": history})}

        if action == "subscription":
            sub = get_subscription(user_id)
            plans_list = []
            for p in PLANS.values():
                plans_list.append({
                    "id": p["id"], "name": p["name"], "badge": p["badge"],
                    "color": p["color"], "price_month": p["price_month"],
                    "price_year": p["price_year"], "currency": p["currency"],
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

            # Сохраняем сообщение пользователя
            save_msg(user_id, "user", text)

            # Сначала проверяем специальные команды
            command_reply = handle_command(user_id, text, display_name)
            if command_reply:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": command_reply})}

            # Если не команда — спрашиваем GPT
            ai_text = ask_openai(user_id, text, display_name)

            if ai_text:
                save_msg(user_id, "bot", ai_text)
                reply = {"text": ai_text, "type": "text"}
            else:
                # Fallback если OpenAI недоступен
                fallback = (
                    "Прости, сейчас у меня проблемы со связью 🛰️\n"
                    "Попробуй чуть позже или напиши /help для команд."
                )
                save_msg(user_id, "bot", fallback)
                reply = {"text": fallback, "type": "text"}

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
                    "ref": payment_ref, "plan": plan_id, "period": period,
                    "amount": amount, "currency": "RUB",
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
            cancel_text = "Подписка отменена. Жаль тебя терять! 😢\nТы всегда можешь вернуться: /plans"
            save_msg(user_id, "bot", cancel_text)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "message": cancel_text})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}