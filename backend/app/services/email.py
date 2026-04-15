import logging
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


async def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> dict:
    settings = get_settings()

    if not settings.resend_api_key:
        logger.info("Resend API key not configured, skipping email")
        return {"success": False, "error": "Resend not configured"}

    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    if text_body:
        payload["text"] = text_body

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                RESEND_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code in (200, 201):
            data = resp.json()
            logger.info(f"Email sent to {to_email[:3]}***@*** (id={data.get('id', '?')})")
            return {"success": True, "id": data.get("id")}
        else:
            error = resp.text[:200]
            logger.error(f"Resend API error {resp.status_code}: {error}")
            return {"success": False, "error": error}
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return {"success": False, "error": str(e)}


def build_reminder_email(tenant_name: str, amount: float, due_date: str, agency_name: str) -> tuple[str, str, str]:
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


def build_campaign_completed_email(
    campaign_name: str,
    agency_name: str,
    total: int,
    will_pay: int,
    cant_pay: int,
    refuses: int,
    escalated: int,
    no_answer: int,
    amount_recoverable: float,
    dashboard_url: str = "",
) -> tuple[str, str, str]:
    subject = f"Campagne terminée — {campaign_name}"

    success_rate = round(will_pay / total * 100) if total > 0 else 0

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #059669; padding: 24px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Campagne terminée</h1>
        <p style="color: #d1fae5; margin: 4px 0 0; font-size: 14px;">{campaign_name}</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex: 1; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">{total}</p>
            <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Appels</p>
          </div>
          <div style="flex: 1; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">{success_rate}%</p>
            <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Promesses</p>
          </div>
          <div style="flex: 1; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">{amount_recoverable:.0f}€</p>
            <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Récupérable</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #059669;">Va payer</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">{will_pay}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #d97706;">Difficultés</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">{cant_pay}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #dc2626;">Refuse</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">{refuses}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #dc2626;">Escaladé</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">{escalated}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280;">Pas de réponse</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">{no_answer}</td>
          </tr>
        </table>
        {"<a href='" + dashboard_url + "' style='display: block; background: #059669; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px;'>Voir le rapport complet</a>" if dashboard_url else ""}
      </div>
      <div style="padding: 16px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; background: #f8fafc;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Recovia — {agency_name}</p>
      </div>
    </div>
    """

    text = f"""Campagne terminée : {campaign_name}

Résultats :
- {total} appels effectués
- {will_pay} promesses de paiement ({success_rate}%)
- {cant_pay} en difficulté
- {refuses} refus
- {escalated} escaladés
- {no_answer} pas de réponse
- Montant récupérable : {amount_recoverable:.2f}€

— Recovia / {agency_name}"""

    return subject, html, text


def build_escalation_alert_email(
    tenant_name: str,
    tenant_phone: str,
    property_address: str,
    amount_due: float,
    notes: str,
    campaign_name: str,
    agency_name: str,
) -> tuple[str, str, str]:
    subject = f"Escalade — {tenant_name} ({campaign_name})"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #dc2626; padding: 24px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Intervention humaine requise</h1>
        <p style="color: #fecaca; margin: 4px 0 0; font-size: 14px;">{campaign_name}</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;"><strong>{tenant_name}</strong></p>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">Adresse : {property_address}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">Tel : {tenant_phone}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">Montant : {amount_due:.2f}€</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;"><strong>Notes de l'IA :</strong></p>
        <div style="background: #f8fafc; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{notes}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          Recovia — {agency_name}
        </p>
      </div>
    </div>
    """

    text = f"""ESCALADE — Intervention humaine requise

Locataire : {tenant_name}
Adresse : {property_address}
Téléphone : {tenant_phone}
Montant : {amount_due:.2f}€
Campagne : {campaign_name}

Notes IA :
{notes}

— Recovia / {agency_name}"""

    return subject, html, text
