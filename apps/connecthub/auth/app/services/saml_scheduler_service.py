# services/saml_scheduler_service.py

import json
from sqlalchemy import text
from db.context import asyncEngineFactory
from services import auth_service


async def run_saml_sync_for_all_customers():
    """
    Fetch all SSO customer configs from DB,
    extract Azure credentials from s_synchronize_apis,
    and run SamlSync for each customer.
    """
    print("[SAML-SCHEDULER] Job started")

    DATABASE = "onedb"
    async_engine = asyncEngineFactory(DATABASE)

    try:
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT * FROM p_samlconfigs"))
            configs = result.fetchall()

        for c in configs:
            try:
                apis = json.loads(c.s_synchronize_apis)

                tenant_id = client_id = client_secret = app_object_id = None

                for api in apis:
                    if api.get("API_name") == "Token API":
                        # Extract tenant_id from URL
                        url_parts = api["API_URl"].split("/")
                        tenant_id = url_parts[3]
                        client_id = api["body"]["client_id"]
                        client_secret = api["body"]["client_secret"]

                    elif api.get("API_name") == "Audit Logs API":
                        # Extract app_object_id
                        url_parts = api["API_URl"].split("/")
                        app_object_id = url_parts[-2]

                if not all([tenant_id, client_id, client_secret, app_object_id]):
                    print(
                        f"[SAML-SCHEDULER] Skipping account {c.s_accountId} "
                        f"(missing SSO config)"
                    )
                    continue

                await auth_service.SamlSync(
                    tenant_id=tenant_id,
                    client_id=client_id,
                    client_secret=client_secret,
                    app_object_id=app_object_id,
                    accountId=c.s_accountId
                )

                print(
                    f"[SAML-SCHEDULER] Sync completed for accountId={c.s_accountId}"
                )

            except Exception as e:
                print(
                    f"[SAML-SCHEDULER] Error for accountId={c.s_accountId}: {e}"
                )

    finally:
        await async_engine.dispose()
        print("[SAML-SCHEDULER] Job finished")
