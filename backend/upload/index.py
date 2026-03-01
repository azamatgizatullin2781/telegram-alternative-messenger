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

ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "video": ["video/mp4", "video/webm", "video/quicktime"],
    "audio": ["audio/mpeg", "audio/ogg", "audio/wav", "audio/m4a", "audio/mp4"],
    "document": [
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "application/zip", "application/x-rar-compressed",
    ],
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


def detect_category(mime_type):
    for cat, types in ALLOWED_TYPES.items():
        if mime_type in types:
            return cat
    return None


def get_ext(mime_type):
    ext_map = {
        "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
        "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
        "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/m4a": "m4a", "audio/mp4": "m4a",
        "application/pdf": "pdf", "text/plain": "txt", "application/zip": "zip",
    }
    return ext_map.get(mime_type, "bin")


def handler(event: dict, context) -> dict:
    """Загрузка файлов (аватар, медиа в чат) в S3 хранилище."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    user_id = verify_token(token)
    if not user_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Unauthorized"})}

    body = json.loads(event.get("body") or "{}")
    upload_type = body.get("type", "media")  # "avatar" | "media"
    mime_type = body.get("mime", "image/jpeg")
    file_b64 = body.get("data", "")
    file_name = body.get("name", "file")

    if not file_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "No file data"})}

    file_bytes = base64.b64decode(file_b64)
    if len(file_bytes) > MAX_SIZE:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "File too large (max 50MB)"})}

    s3 = get_s3()
    cdn_base = get_cdn_base()

    if upload_type == "avatar":
        if mime_type not in ALLOWED_TYPES["image"]:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Only images allowed for avatar"})}
        ext = get_ext(mime_type)
        key = f"avatars/{user_id}/{uuid.uuid4().hex}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime_type)
        url = f"{cdn_base}/files/{key}"
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = %s WHERE id = %s", (url, user_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": url})}

    if upload_type == "media":
        category = detect_category(mime_type)
        if not category:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unsupported file type"})}
        ext = get_ext(mime_type)
        safe_name = uuid.uuid4().hex
        key = f"media/{user_id}/{category}/{safe_name}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=mime_type)
        url = f"{cdn_base}/files/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "url": url,
            "category": category,
            "name": file_name,
            "size": len(file_bytes),
            "mime": mime_type,
        })}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown type"})}
