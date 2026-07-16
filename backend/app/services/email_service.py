"""
Email Service

Sends transactional email (verification links, password resets) via SMTP
when configured. Without SMTP_HOST the message is logged to the console
instead, so every flow stays fully testable in local/dev environments.
"""
import smtplib
from email.mime.text import MIMEText

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email. Returns True if delivered via SMTP, False if it
    fell back to console logging (dev mode) or delivery failed."""
    if settings.SMTP_HOST:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("email sent", to=to, subject=subject)
            return True
        except Exception as e:
            logger.error("email send failed, falling back to console", to=to, error=str(e))

    logger.info("email (console fallback)", to=to, subject=subject, body=body)
    return False
