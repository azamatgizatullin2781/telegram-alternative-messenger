import os
import json
import base64
import uuid
import boto3
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42269837_telegram_alternative")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

ALLOWED_MIME = {
    # Images
    "image/jpeg": ("image", "jpg"),
    "image/png": ("image", "png"),
    "image/gif": ("image", "gif"),
    "image/webp": ("image", "webp"),
    # Video
    "video/mp4": ("video", "mp4"),
    "video/webm": ("video", "webm"),
    "video/quicktime": ("video", "mov"),
    "video/x-matroska": ("video", "mkv"),
    # Audio (all variants browsers produce)
    "audio/mpeg": ("audio", "mp3"),
    "audio/mp3": ("audio", "mp3"),
    "audio/ogg": ("audio", "ogg"),
    "audio/wav": ("audio", "wav"),
    "audio/wave": ("audio", "wav"),
    "audio/x-wav": ("audio", "wav"),
    "audio/m4a": ("audio", "m4a"),
    "audio/mp4": ("audio", "m4a"),
    "audio/aac": ("audio", "aac"),
    "audio/webm": ("audio", "webm"),
    "audio/webm;codecs=opus": ("audio", "webm"),
    "audio/ogg;codecs=opus": ("audio", "ogg"),
    # Documents
    "application/pdf": ("document", "pdf"),
    "application/msword": ("document", "doc"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ("document", "docx"),
    "application/vnd.ms-excel": ("document", "xls"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ("document", "xlsx"),
    "text/plain": ("document", "txt"),
    "application/zip": ("document", "zip"),
    "application/x-rar-compressed": ("document", "rar"),
    "application/x-zip-compressed": ("document", "zip"),
    "application/octet-stream": ("document", "bin"),
}

MAX_SIZE = 50 * 1024 * 1024  # 50 MB


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def get_cdn_base():
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket"


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


def normalize_mime(mime_type: str) -> str:
    """Нормализует mime-тип, убирая параметры (codecs=...) для поиска в словаре."""
    if not mime_type:
        return "application/octet-stream"
    # Сначала пробуем точное совпадение (включая codecs)
    if mime_type in ALLOWED_MIME:
        return mime_type
    # Потом базовый тип без параметров
    base = mime_type.split(";")[0].strip().lower()
    return base


def handler(event: dict, context) -> dict:
    """Загрузка файлов (аватар, медиа, голосовые, видеокружочки) в S3 хранилище."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    user_id = verify_token(token)
    if not user_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Unauthorized"})}

    body = json.loads(event.get("body") or "{}")
    upload_type = body.get("type", "media")
    raw_mime = body.get("mime", "application/octet-stream")
    file_b64 = body.get("data", "")
    file_name = body.get("name", "file")

    if not file_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "No file data"})}

    # Decode base64 — handle both with and without data URI prefix
    try:
        if "," in file_b64 and file_b64.startswith("data:"):
            file_b64 = file_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(file_b64)
    except Exception as e:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Invalid base64: {e}"})}

    if len(file_bytes) > MAX_SIZE:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "File too large (max 50MB)"})}

    s3 = get_s3()
    cdn_base = get_cdn_base()

    # ── Avatar ──────────────────────────────────────────────────────────────────
    if upload_type == "avatar":
        mime = normalize_mime(raw_mime)
        info = ALLOWED_MIME.get(mime)
        if not info or info[0] != "image":
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Only images allowed for avatar"})}
        ext = info[1]
        key = f"avatars/{user_id}/{uuid.uuid4().hex}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime)
        url = f"{cdn_base}/files/{key}"
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = %s WHERE id = %s", (url, user_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": url})}

    # ── Voice message ───────────────────────────────────────────────────────────
    if upload_type == "voice":
        # Browsers record as audio/webm, audio/ogg, etc.
        mime = normalize_mime(raw_mime)
        # If mime not recognized as audio, force to audio/webm
        info = ALLOWED_MIME.get(mime)
        if not info or info[0] != "audio":
            mime = "audio/webm"
            info = ("audio", "webm")
        ext = info[1]
        key = f"voice/{user_id}/{uuid.uuid4().hex}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime)
        url = f"{cdn_base}/files/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "url": url, "category": "voice", "name": file_name,
            "size": len(file_bytes), "mime": mime,
        })}

    # ── Video note (кружочек) ────────────────────────────────────────────────────
    if upload_type == "video_note":
        mime = normalize_mime(raw_mime)
        info = ALLOWED_MIME.get(mime)
        if not info or info[0] != "video":
            mime = "video/webm"
            info = ("video", "webm")
        ext = info[1]
        key = f"video_notes/{user_id}/{uuid.uuid4().hex}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime)
        url = f"{cdn_base}/files/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "url": url, "category": "video_note", "name": file_name,
            "size": len(file_bytes), "mime": mime,
        })}

    # ── General media ────────────────────────────────────────────────────────────
    if upload_type == "media":
        mime = normalize_mime(raw_mime)
        info = ALLOWED_MIME.get(mime)
        if not info:
            # Fallback: try to guess from file extension
            ext_from_name = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
            ext_to_mime = {
                "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "gif": "image/gif", "webp": "image/webp",
                "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
                "mp3": "audio/mpeg", "ogg": "audio/ogg", "wav": "audio/wav",
                "m4a": "audio/m4a", "aac": "audio/aac",
                "pdf": "application/pdf", "txt": "text/plain",
                "zip": "application/zip", "doc": "application/msword",
            }
            if ext_from_name in ext_to_mime:
                mime = ext_to_mime[ext_from_name]
                info = ALLOWED_MIME.get(mime)
        if not info:
            # Last resort: use as document
            info = ("document", "bin")
            mime = "application/octet-stream"

        category, ext = info
        safe_name = uuid.uuid4().hex
        key = f"media/{user_id}/{category}/{safe_name}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime)
        url = f"{cdn_base}/files/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "url": url,
            "category": category,
            "name": file_name,
            "size": len(file_bytes),
            "mime": mime,
        })}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Unknown upload type: {upload_type}"})}
