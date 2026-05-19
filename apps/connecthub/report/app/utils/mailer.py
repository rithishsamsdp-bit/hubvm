import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "reports@pulseindia.in")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "rjho xycx srue jomm")
FROM_EMAIL = os.getenv("FROM_EMAIL", EMAIL_HOST_USER)

def send_email_with_attachment(
    to_emails: List[str],
    subject: str,
    body: str,
    attachment_content: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
    cc_emails: Optional[List[str]] = None
):
    """
    Sends an email with an optional attachment.
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = ", ".join(to_emails)
        msg['Subject'] = subject
        
        if cc_emails:
            logger.info(f"[DEBUG] Adding CC emails: {cc_emails}")
            msg['Cc'] = ", ".join(cc_emails)
            # Recipients are handled later in all_recipients

        msg.attach(MIMEText(body, 'plain'))

        if attachment_content and attachment_filename:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment_content)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= "{attachment_filename}"',
            )
            msg.attach(part)

        logger.info(f"[SMTP] Connecting to {EMAIL_HOST}:{EMAIL_PORT}...")
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.ehlo()
        server.starttls()
        server.ehlo()
        
        logger.info(f"[SMTP] Logging in as {EMAIL_HOST_USER}...")
        server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
        
        text = msg.as_string()
        
        # All recipients for the SMTP envelope
        all_recipients = to_emails + (cc_emails if cc_emails else [])
        
        logger.info(f"[SMTP] Sending email to: {all_recipients}")
        response = server.sendmail(FROM_EMAIL, all_recipients, text)
        logger.info(f"[SMTP] Response: {response}")
        
        server.quit()
        logger.info(f"Email sent successfully to {all_recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
