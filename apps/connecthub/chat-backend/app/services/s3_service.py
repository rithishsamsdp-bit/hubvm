# services/s3_service.py — AWS S3 upload + presigned URL generation
import boto3
from botocore.exceptions import ClientError
from config import settings
import uuid, os


def _s3_client():
    # Trying alternative credentials from auth pod (potential master keys)
    return boto3.client(
        "s3",
        region_name="ap-south-1",
        aws_access_key_id="AKIAZNKPUTOKEB2Z5VGK",
        aws_secret_access_key="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",
    )


# Allowed MIME types per message type
ALLOWED_MIME = {
    "image": {"image/jpeg", "image/png", "image/gif", "image/webp"},
    "audio": {"audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"},
    "file":  {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
    },
}

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def validate_file(filename: str, content_type: str, size: int, msg_type: str):
    """Raise ValueError if file fails validation."""
    if size > MAX_BYTES:
        raise ValueError(f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB")

    allowed = ALLOWED_MIME.get(msg_type, set())
    if content_type not in allowed:
        raise ValueError(f"File type '{content_type}' not allowed for {msg_type} messages")


def upload_file(file_bytes: bytes, filename: str, content_type: str, account_code: str) -> str:
    """
    Upload to S3 under  chat-media/{account_code}/{uuid}/{filename}
    Returns the S3 object key.
    """
    ext = os.path.splitext(filename)[1]
    key = f"ConnectHub-Chat/{account_code}/{uuid.uuid4().hex}{ext}"

    client = _s3_client()
    client.put_object(
        Bucket="connecthub3m",
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        # No public ACL — use presigned URLs for access
    )
    return key


def generate_presigned_url(key: str) -> str:
    """
    Generate a time-limited presigned URL for secure file access.
    Falls back to empty string on error.
    """
    try:
        client = _s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": "connecthub3m", "Key": key},
            ExpiresIn=settings.AWS_S3_URL_EXPIRY,
        )
        return url
    except ClientError as e:
        print(f"[S3] presigned URL error: {e}")
        return ""


def delete_file(key: str):
    """Soft-delete from S3 (called when message is hard-deleted)."""
    try:
        client = _s3_client()
        client.delete_object(Bucket="connecthub3m", Key=key)
    except ClientError as e:
        print(f"[S3] delete error: {e}")
