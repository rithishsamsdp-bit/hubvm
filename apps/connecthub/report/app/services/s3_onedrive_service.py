import os
import boto3
import requests
from datetime import datetime, timedelta, timezone
from services.microsoft_token_service import get_access_token

AWS_BUCKET = os.getenv("AWS_BUCKET")

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)


def onedrive_file_exists(token: str, path: str) -> bool:
    url = f"https://graph.microsoft.com/v1.0/me/drive/root:{path}"
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(url, headers=headers)
    return r.status_code == 200


async def upload_s3_daily_files():
    token = await get_access_token()

    # 🔹 Yesterday 00:00 UTC
    yesterday_start = (
        datetime.now(timezone.utc) - timedelta(days=1)
    ).replace(hour=0, minute=0, second=0, microsecond=0)

    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(
        Bucket=AWS_BUCKET,
        Prefix="FBL-Recording/"
    ):
        if "Contents" not in page:
            continue

        for obj in page["Contents"]:
            s3_key = obj["Key"]

            # Skip folder marker
            if s3_key.endswith("/"):
                continue

            # 🚀 Skip old 10-month files
            if obj["LastModified"] < yesterday_start:
                continue

            file_date = obj["LastModified"]

            year = file_date.strftime("%Y")
            month = file_date.strftime("%B")
            day = file_date.strftime("%d")

            filename = os.path.basename(s3_key)

            onedrive_path = (
                f"/FBL_S3_Rec/{year}/{month}/{day}/{filename}"
            )

            # 🔁 Duplicate check
            if onedrive_file_exists(token, onedrive_path):
                print(f"⏭ Skipped (exists): {filename}")
                continue

            print(f"⬆ Uploading: {filename}")

            s3_obj = s3.get_object(
                Bucket=AWS_BUCKET,
                Key=s3_key
            )
            data = s3_obj["Body"].read()

            upload_url = (
                f"https://graph.microsoft.com/v1.0/me/drive/root:"
                f"{onedrive_path}:/content"
            )

            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/octet-stream"
            }

            r = requests.put(upload_url, headers=headers, data=data)

            if r.status_code not in (200, 201):
                raise Exception(f"Upload failed: {r.text}")

    print("✅ Daily S3 → OneDrive sync completed")
