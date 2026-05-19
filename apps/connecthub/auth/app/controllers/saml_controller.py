from fastapi import APIRouter, Request, Response, Form, status, Query, File, UploadFile
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from services import auth_service
from models.dto import MembersModel
from jinja2 import Environment, FileSystemLoader
import pymysql, json, logging, sys
from urllib.parse import quote
from config import settings
from datetime import datetime
from datetime import timezone
from services import saml_scheduler_service
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)
env = Environment(loader=FileSystemLoader("templates"))


def prepare_request(request: Request):
    """
    Prepare request data for SAML authentication.
    Handles both direct requests and requests behind reverse proxies.
    """
    # Check for X-Forwarded-Proto header (set by reverse proxies)
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_host = request.headers.get("x-forwarded-host", "")
    forwarded_port = request.headers.get("x-forwarded-port", "")
    
    # Determine the actual scheme
    if forwarded_proto:
        scheme = forwarded_proto
    else:
        scheme = request.url.scheme
    
    # Determine the actual host
    if forwarded_host:
        http_host = forwarded_host
    else:
        http_host = request.headers.get("host", request.url.netloc)
    
    # Determine the actual port
    if forwarded_port:
        server_port = forwarded_port
    elif scheme == "https":
        server_port = "443"
    else:
        server_port = "80"
    
    logging.info(f"🔧 Prepared request - scheme: {scheme}, host: {http_host}, port: {server_port}")
    
    return {
        "https": "on" if scheme == "https" else "off",
        "http_host": http_host,
        "server_port": server_port,
        "script_name": request.scope.get("root_path", ""),
        "get_data": request.query_params,
        "post_data": {},
    }


def extract_domain_from_email(email: str) -> str:
    if "@" in email:
        return email.split("@")[-1].lower()
    return email.lower()


@router.get("/saml", response_class=HTMLResponse)
async def index(request: Request, response: Response):
    # Option 1: check for email in cookie/session (if stored)
    email = request.cookies.get("pulse_sso_email")
    if not email:
        return env.get_template("index.html").render(prompt_email=True)

    logging.info(f"📊 SSO Cookie Email: {email}")
    domain = extract_domain_from_email(email)
    logging.info(f"📊 Extracted Searching Domain: '{domain}'")

    # Check if domain is configured for SAML
    saml_config = await auth_service.getBySamlConfigDomain(domain, 'onedb')
    if saml_config:
        logging.info(f"✅ SAML Config found for domain '{domain}', provider: {saml_config.get('provider')}")
        return RedirectResponse(url=f"/auth/loginsso?email={quote(email)}")

    logging.warning(f"❌ No SAML Config found for domain '{domain}'. Redirecting to standard login.")
    # Not a SAML user, return standard login page
    response = RedirectResponse(url="https://connecthub.pulsework360.com/login", status_code=302)
    response.delete_cookie("pulse_sso_email")
    return response


@router.get("/set-email")
async def set_email(email: str = Query(...)):
    """
    Temporary route to set the email in a cookie and redirect back to the SAML index.
    This is triggered by the email prompt page.
    """
    response = RedirectResponse(url="/auth/saml")
    response.set_cookie(
        key="pulse_sso_email",
        value=email,
        httponly=True,
        secure=True,
        samesite="Lax"
    )
    return response


@router.get("/loginsso")
async def login(request: Request, email: str = Query(...)):
    domain = extract_domain_from_email(email)
    saml_settings = await auth_service.getBySamlConfigDomain(domain, 'onedb')

    if not saml_settings:
        return HTMLResponse(f"No SAML configuration found for domain: {domain}", status_code=400)

    logging.info(f"📋 SAML settings loaded for domain: {domain}")
    logging.info(f"📋 Entity ID: {saml_settings.get('sp', {}).get('entityId', 'N/A')}")
    logging.info(f"📋 ACS URL: {saml_settings.get('sp', {}).get('assertionConsumerService', {}).get('url', 'N/A')}")

    req = prepare_request(request)
    
    # Use RelayState to pass email
    return_to_url = f"?email={quote(email)}"
    
    auth = OneLogin_Saml2_Auth(req, old_settings=saml_settings)
    sso_url = auth.login(return_to=return_to_url)
    
    logging.info(f"🔗 Redirecting to SSO URL: {sso_url[:100]}...")
    
    # Set cookie before redirect
    response = RedirectResponse(sso_url)
    response.set_cookie(
        key="pulse_sso_email",
        value=email,
        httponly=True,
        secure=True,
        samesite="Lax"
    )
    return response


@router.get("/saml/configure")
async def get_saml_config(request: Request):
    # Check for authentication
    token = request.cookies.get(settings.AUTH_TOKEN_NAME)
    
    # If no token, return the HTML form (legacy behavior or for unauthenticated access if needed, though arguably should be 401)
    # But since the previous code returned HTML, let's keep that for unauthenticated or browser navigation if it was used that way.
    # However, the frontend now expects JSON.
    
    if token:
        token_data = auth_service.decode(token)
        if not isinstance(token_data, JSONResponse):
             # Authenticated user
            account_id = token_data.m_accountId
            provider = request.query_params.get('provider')
            saml_config = await auth_service.getSAMLConfigByAccountId(account_id, 'onedb', provider)
            
            accept_header = request.headers.get('accept', '')
            content_type_header = request.headers.get('content-type', '')
            
            if 'application/json' in accept_header or 'application/json' in content_type_header:
                if saml_config:
                    return JSONResponse(content={
                        "domain": saml_config.s_samlDomain,
                        "entity_id": saml_config.s_samlEntityId,
                        "login_url": saml_config.s_samlLoginUrl,
                        "certificate": saml_config.s_samlCertificate,
                        "synchronize_apis": saml_config.s_synchronize_apis,
                        "provider": saml_config.s_provider
                    })
                else:
                    return JSONResponse(status_code=404, content={"message": "SAML configuration not found"})

    # Fallback to HTML template for browser direct access if not JSON request
    template = env.get_template("saml_form.html")
    return template.render()


@router.delete("/saml/configure")
async def delete_saml_config(request: Request):
    token = request.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=401, content={"message": "Authentication required"})
        
    token_data = auth_service.decode(token)
    if isinstance(token_data, JSONResponse):
        return token_data
        
    account_id = token_data.m_accountId
    provider = request.query_params.get('provider', 'azure')
    success = await auth_service.deleteSAMLConfig(account_id, 'onedb', provider)
    
    if success:
        return JSONResponse(content={"message": "SAML configuration deleted successfully"})
    else:
        return JSONResponse(status_code=404, content={"message": "No configuration found to delete"})


@router.post("/saml/configure")
async def configure_saml(
    request: Request,
    domain: str = Form(...),
    entityid: str = Form(...),
    loginurl: str = Form(...),
    provider: str = Form("azure"),
    certificate: UploadFile = File(...)
):
    """
    Configure SAML settings for a domain.
    Accepts form data with domain, entityId, loginUrl, and certificate file.
    Requires authentication - extracts account ID from session token.
    """
    # Get token from cookies and decode to get user details
    token = request.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Authentication required. Please login."}
        )
    
    # Decode token to get user data
    token_data = auth_service.decode(token)
    if isinstance(token_data, JSONResponse):
        return token_data
    
    try:
        # Validate certificate file
        if not certificate.filename.endswith('.cer'):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"message": "Invalid certificate file. Please upload a .cer file"}
            )
        
        # Read certificate content
        certificate_content = await certificate.read()
        
        # Decode certificate from bytes to string
        try:
            # Try to decode as UTF-8 first
            decoded_certificate = certificate_content.decode('utf-8')
        except UnicodeDecodeError:
            # If UTF-8 fails, try latin-1
            decoded_certificate = certificate_content.decode('latin-1')
        
        # Remove any PEM headers/footers and whitespace to get clean base64
        decoded_certificate = decoded_certificate.replace('-----BEGIN CERTIFICATE-----', '')
        decoded_certificate = decoded_certificate.replace('-----END CERTIFICATE-----', '')
        decoded_certificate = decoded_certificate.replace('\n', '').replace('\r', '').strip()
        
        # Extract account ID from token data
        account_id = token_data.m_accountId
        
        logging.info(f"📝 Configuring SAML for domain: {domain}")
        logging.info(f"📝 Account ID: {account_id}")
        logging.info(f"📝 Entity ID: {entityid}")
        logging.info(f"📝 Login URL: {loginurl}")
        logging.info(f"📝 Certificate length: {len(decoded_certificate)} chars")
        
        # Save to database with account ID
        await auth_service.samlConfigure(
            domain=domain,
            entityid=entityid,
            loginurl=loginurl,
            decodedcontent=decoded_certificate,
            accountid=account_id,
            provider=provider,
            database='onedb'
        )
        
        logging.info(f"✅ SAML configuration saved successfully for domain: {domain}")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": f"SAML configuration created successfully for domain: {domain}"}
        )
        
    except HTTPException as e:
        logging.error(f"❌ HTTP Exception: {e.detail}")
        return JSONResponse(
            status_code=e.status_code,
            content={"message": e.detail}
        )
    except Exception as e:
        logging.error(f"❌ Error configuring SAML: {str(e)}", exc_info=True)

from pydantic import BaseModel

class SyncModel(BaseModel):
    sync_apis: list

@router.post("/saml/sync")
async def sync_saml(request: Request, sync_data: SyncModel):
    """
    Update synchronization APIs JSON for SAML configuration.
    """
    token = request.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=401, content={"message": "Authentication required"})
        
    token_data = auth_service.decode(token)
    if isinstance(token_data, JSONResponse):
        return token_data
        
    account_id = token_data.m_accountId
    
    try:
        success = await auth_service.updateSyncApis(account_id, sync_data.sync_apis, 'onedb')
        if success:
            return JSONResponse(content={"message": "Synchronization APIs updated successfully"})
        else:
            return JSONResponse(status_code=404, content={"message": "SAML configuration not found"})
    except Exception as e:
        logging.error(f"❌ Error updating sync APIs: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, content={"message": f"Failed to update sync APIs: {str(e)}"})





@router.get("/logout")
async def logout(request: Request):
    email = request.cookies.get("pulse_sso_email")
    if not email:
        return HTMLResponse("❌ No email cookie found", status_code=400)

    domain = extract_domain_from_email(email)
    saml_settings = await auth_service.getBySamlConfigDomain(domain, 'onedb')

    if not saml_settings:
        return HTMLResponse("❌ SAML settings not found for domain", status_code=400)

    provider = saml_settings.get('provider', 'azure')
    redirect_url = "https://connecthub.pulsework360.com/"

    if provider == 'azure':
        azure_logout_url = "https://login.microsoftonline.com/common/oauth2/logout"
        final_logout_url = f"{azure_logout_url}?post_logout_redirect_uri={redirect_url}"
    elif provider == 'google':
        # Google logout usually doesn't support a direct SAML logout with redirect easily without complex setup, 
        # but the standard logout URL is:
        final_logout_url = f"https://accounts.google.com/Logout?continue={redirect_url}"
    else:
        # Fallback to just clearing session
        final_logout_url = redirect_url

    response = RedirectResponse(final_logout_url)
    response.delete_cookie("pulse_sso_email")
    response.delete_cookie(settings.AUTH_TOKEN_NAME)
    
    return response


@router.get("/sso/sls")
async def sls(request: Request):
    req = prepare_request(request)
    auth = OneLogin_Saml2_Auth(req, custom_base_path="app/controllers")
    
    try:
        dscb = lambda: logging.info("📤 Logout response successfully handled.")
        auth.process_slo(delete_session_cb=dscb)
    except Exception as e:
        logging.error(f"❌ Error during logout: {e}", exc_info=True)
        return HTMLResponse(f"❌ Error during logout: {e}", status_code=500)

    return RedirectResponse("/")


@router.get("/set-email")
def set_email(email: str, response: Response):
    response = RedirectResponse(url="/auth/saml")
    response.set_cookie(
        key="pulse_sso_email",
        value=email,
        httponly=True,
        secure=True,
        samesite="Lax"
    )
    return response


@router.post("/sso/acs")
async def acs(request: Request):
    logging.info(f"🔍 Request URL: {request.url}")
    logging.info(f"🔍 Request scheme: {request.url.scheme}")
    logging.info(f"🔍 X-Forwarded-Proto: {request.headers.get('x-forwarded-proto', 'NOT SET')}")
    logging.info(f"🔍 X-Forwarded-Host: {request.headers.get('x-forwarded-host', 'NOT SET')}")
    logging.info(f"🔍 Host header: {request.headers.get('host', 'NOT SET')}")

    req = prepare_request(request)
    req["post_data"] = await request.form()
    
    # Log the SAML Response for debugging
    saml_response = req["post_data"].get("SAMLResponse", "")
    logging.info(f"📩 SAMLResponse received (length: {len(saml_response)} chars)")

    # Extract email from RelayState or cookie
    relay_state = req["post_data"].get("RelayState", "")
    email = request.cookies.get("pulse_sso_email")

    logging.info(f"🔍 RelayState: {relay_state}")
    logging.info(f"🔍 Email from cookie: {email}")

    if not email and "email=" in relay_state:
        from urllib.parse import parse_qs, unquote
        # RelayState might be just "?email=..." or a full URL
        if "?" in relay_state:
            query_string = relay_state.split("?", 1)[-1]
        else:
            query_string = relay_state
        
        parsed = parse_qs(query_string)
        email = parsed.get("email", [None])[0]
        if email:
            email = unquote(email)

    if not email:
        logging.error("❌ Email missing in RelayState and cookies")
        return HTMLResponse("403 Forbidden - Email missing in RelayState", status_code=403)

    logging.info(f"📧 Processing SSO for email: {email}")

    domain = extract_domain_from_email(email)
    saml_settings = await auth_service.getBySamlConfigDomain(domain, 'onedb')
    
    if not saml_settings:
        logging.error(f"❌ No SAML settings found for domain: {domain}")
        return HTMLResponse(f"403 Forbidden - No SAML settings for domain: {domain}", status_code=403)

    # Log the SAML settings
    logging.info(f"⚙️ SAML Settings Entity ID: {saml_settings.get('sp', {}).get('entityId', 'N/A')}")
    logging.info(f"⚙️ SAML Settings ACS URL: {saml_settings.get('sp', {}).get('assertionConsumerService', {}).get('url', 'N/A')}")
    logging.info(f"⚙️ Request prepared with HTTPS: {req.get('https', 'N/A')}")

    try:
        auth = OneLogin_Saml2_Auth(req, old_settings=saml_settings)
        auth.process_response()
        errors = auth.get_errors()

        if errors:
            error_reason = auth.get_last_error_reason()
            logging.error(f"❌ SAML Errors: {errors}")
            logging.error(f"❌ Error Reason: {error_reason}")
            
            if auth.get_last_request_id():
                logging.error(f"❌ Request ID: {auth.get_last_request_id()}")
            
            return HTMLResponse(
                f"403 Forbidden - SAML Error: {errors}<br>Reason: {error_reason}", 
                status_code=403
            )

        if not auth.is_authenticated():
            logging.error("❌ User not authenticated after processing response")
            return HTMLResponse("403 Forbidden - Authentication failed", status_code=403)

        attributes = auth.get_attributes()
        name_id = auth.get_nameid()
        
        logging.info(f"✅ SAML Authentication successful for: {name_id}")
        logging.info(f"📋 Attributes received: {list(attributes.keys())}")

        memberMailId = name_id
        accountDomainId = memberMailId.split("@")[1]

        logging.info(f"🔍 Looking up account for domain: '{accountDomainId}'")
        accountDetails = await auth_service.getByAccountDomainId(accountDomainId, "onedb")
        logging.info(f"🔍 Account lookup result: {accountDetails}")
        if not accountDetails:
            logging.error(f"❌ No account found for domain: '{accountDomainId}' (exact value used in query)")
            return HTMLResponse(f"401 UNAUTHORIZED - Invalid Email Id (Account not found for domain: {accountDomainId})", status_code=401)
            
        logging.info(f"🔍 Looking up member for email: '{memberMailId}'")
        memberDetails = await auth_service.getByMemberMailId(memberMailId, "onedb")
        logging.info(f"🔍 Member lookup result: {memberDetails}")
        if not memberDetails:
            logging.error(f"❌ No member found for email: '{memberMailId}' (exact value used in query)")
            return HTMLResponse(f"401 UNAUTHORIZED - Invalid Email Id (Member not found: {memberMailId})", status_code=401)
        
        access_token = auth_service.encode(memberDetails, settings.AUTH_TOKEN_EXPIRY)

        response = RedirectResponse(url="https://connecthub.pulsework360.com/login", status_code=302)
        response.set_cookie(
            key=settings.AUTH_TOKEN_NAME,
            value=access_token,
            httponly=True,
            max_age=int(settings.AUTH_TOKEN_EXPIRY.total_seconds()),
            secure=True,
            samesite="Lax",
        )
        response.set_cookie(
            key="pulse_sso_email",
            value=email,
            httponly=True,
            secure=True,
            samesite="Lax"
        )
        
        logging.info(f"✅ SSO login successful, redirecting to ConnectHub")
        return response

    except Exception as e:
        logging.error(f"❌ Exception during SAML processing: {str(e)}", exc_info=True)
        return HTMLResponse(f"500 Internal Server Error - {str(e)}", status_code=500)
    
@router.get("/sso/dummy")
async def acs(request: Request):
    a = await saml_scheduler_service.run_saml_sync_for_all_customers()
    return a