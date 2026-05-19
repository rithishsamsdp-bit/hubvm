import requests
from repos.onedrive_token_repo import (
    get_onedrive_config,
    update_refresh_token
)

async def get_access_token():
    config = await get_onedrive_config()

    if not config:
        raise Exception("OneDrive config not found in DB")

    url = f"https://login.microsoftonline.com/{config.od_tenantId}/oauth2/v2.0/token"

    data = {
        "client_id": config.od_clientId,
        "client_secret": config.od_clientSecret,
        "grant_type": "refresh_token",
        "refresh_token": config.od_refresh_token,
        "scope": "https://graph.microsoft.com/.default"
    }

    r = requests.post(url, data=data)

    if r.status_code != 200:
        raise Exception(f"Token error: {r.text}")

    res = r.json()

    # 🔁 Save new refresh token if Microsoft sends it
    if "refresh_token" in res:
        await update_refresh_token(config.od_id, res["refresh_token"])

    return res["access_token"]
