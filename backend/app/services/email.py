import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> dict:
    """Send an email via SMTP."""
    settings = get_settings()

    if not settings.smtp_host or not settings.smtp_user:
        raise RuntimeError("SMTP credentials not configured")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        logger.info(f"Email sent to {to_email[:3]}***@***")
        return {"success": True}
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return {"success": False, "error": str(e)}


def build_reminder_email(tenant_name: str, amount: float, due_date: str, agency_name: str) -> tuple[str, str]:
    """Build HTML + text body for a rent reminder email."""
    subject = f"Rappel de loyer — {amount:.2f}€ dû le {due_date}"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #059669; padding: 24px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Rappel de paiement</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Bonjour <strong>{tenant_name}</strong>,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Nous vous rappelons que votre loyer de <strong>{amount:.2f}€</strong>
          était dû le <strong>{due_date}</strong>.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #059669; font-size: 24px; font-weight: 700; margin: 0;">{amount:.2f}€</p>
          <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0;">Montant dû</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Merci de régulariser votre situation dans les meilleurs délais.
          En cas de difficulté, n&apos;hésitez pas à nous contacter.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
          Cordialement,<br>
          <strong>{agency_name}</strong>
        </p>
      </div>
    </div>
    """

    text = f"""Bonjour {tenant_name},

Nous vous rappelons que votre loyer de {amount:.2f}€ était dû le {due_date}.

Merci de régulariser votre situation dans les meilleurs délais.

Cordialement,
{agency_name}"""

    return subject, html, text
