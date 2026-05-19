# controllers/upload_controller.py — File/image/audio upload to AWS S3
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from middlewares.auth_middleware import get_current_user, CurrentUser
from services import s3_service

router = APIRouter(prefix="/chat", tags=["Chat Upload"])

# Mapping frontend messageType → allowed MIME sets
MSG_TYPE_MAP = {
    "image": "image",
    "audio": "audio",
    "file":  "file",
}


@router.post("/upload")
@router.post("/upload/")
async def upload_media(
    file: UploadFile  = File(...),
    msgType: str      = Form(...),           # "image" | "audio" | "file"
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Upload a file to S3 and return the S3 key + presigned URL.
    The key is then sent as `content` in the send_message socket event.

    Security:
    - File type validated against allowed MIME list per msgType
    - File size enforced (MAX_FILE_SIZE_MB from config)
    - Content-type taken from header (client-declared), not extension alone
    """
    msg_type = MSG_TYPE_MAP.get(msgType)
    if not msg_type:
        raise HTTPException(status_code=400, detail=f"Invalid msgType: {msgType}")

    content_type = file.content_type or "application/octet-stream"
    file_bytes   = await file.read()
    file_size    = len(file_bytes)

    # Validate before upload
    try:
        s3_service.validate_file(file.filename, content_type, file_size, msg_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Upload to S3
    try:
        key = s3_service.upload_file(
            file_bytes,
            file.filename,
            content_type,
            current_user.account_code,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    presigned_url = s3_service.generate_presigned_url(key)

    return {
        "success": True,
        "data": {
            "key":          key,
            "presignedUrl": presigned_url,
            "fileName":     file.filename,
            "fileSize":     file_size,
            "mimeType":     content_type,
            "msgType":      msgType,
        }
    }
