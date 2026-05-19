from fastapi import APIRouter
from services.s3_onedrive_service import upload_single_file

router = APIRouter(prefix="/onedrive")

@router.post("/run-now")
def run_now():
    upload_single_file(
        "f66af35ac9fdf67da7386d6eebf25fc6/testfile.wav",
        "/FBL_S3_Rec/testfile.wav"
    )
    return {"status": "success"}
