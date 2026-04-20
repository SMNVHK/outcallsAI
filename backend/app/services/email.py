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
    will_pay_details: list[dict] | None = None,
    escalated_details: list[dict] | None = None,
) -> tuple[str, str, str]:
    subject = f"Campagne terminée — {campaign_name}"

    success_rate = round(will_pay / total * 100) if total > 0 else 0

    will_pay_section = ""
    if will_pay_details:
        rows = ""
        for t in will_pay_details:
            rows += (
                f'<tr style="border-bottom: 1px solid #f1f5f9;">'
                f'<td style="padding: 10px 12px; color: #334155; font-size: 14px;">{t.get("name", "—")}</td>'
                f'<td style="padding: 10px 12px; text-align: right; color: #059669; font-weight: 600; font-size: 14px;">{t.get("amount", 0):.0f}€</td>'
                f'<td style="padding: 10px 12px; text-align: right; color: #6b7280; font-size: 13px;">{t.get("promised_date", "—")}</td>'
                f'</tr>'
            )
        will_pay_section = (
            f'<div style="margin-top: 28px;">'
            f'<h3 style="color: #059669; font-size: 15px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #d1fae5;">Promesses de paiement</h3>'
            f'<table style="width: 100%; border-collapse: collapse;">'
            f'<tr style="background: #f0fdf4;">'
            f'<th style="padding: 8px 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Locataire</th>'
            f'<th style="padding: 8px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Montant</th>'
            f'<th style="padding: 8px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Date promise</th>'
            f'</tr>'
            f'{rows}'
            f'</table>'
            f'</div>'
        )

    escalated_section = ""
    if escalated_details:
        items = ""
        for t in escalated_details:
            items += (
                f'<div style="padding: 10px 14px; border-bottom: 1px solid #fecaca;">'
                f'<p style="color: #334155; font-size: 14px; font-weight: 600; margin: 0;">{t.get("name", "—")}</p>'
                f'<p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">{t.get("reason", "—")}</p>'
                f'</div>'
            )
        escalated_section = (
            f'<div style="margin-top: 28px;">'
            f'<h3 style="color: #dc2626; font-size: 15px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">Cas escaladés</h3>'
            f'<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; overflow: hidden;">'
            f'{items}'
            f'</div>'
            f'</div>'
        )

    recommendations = []
    if will_pay > 0:
        recommendations.append("Vérifiez les paiements après les dates promises")
    if cant_pay > 0:
        recommendations.append("Contactez les locataires en difficulté pour proposer un arrangement")
    if refuses > 0:
        recommendations.append(f"{refuses} locataire(s) refusent — envisagez une mise en demeure")
    if escalated > 0:
        recommendations.append(f"{escalated} cas nécessitent une intervention humaine urgente")
    if total > 0 and no_answer > total / 3:
        recommendations.append("Taux d'injoignables élevé — envisagez des SMS de relance")

    recommendations_section = ""
    if recommendations:
        rec_items = ""
        for rec in recommendations:
            rec_items += (
                f'<tr><td style="padding: 6px 0; vertical-align: top; color: #059669; font-size: 14px; width: 20px;">→</td>'
                f'<td style="padding: 6px 0; color: #334155; font-size: 14px; line-height: 1.5;">{rec}</td></tr>'
            )
        recommendations_section = (
            f'<div style="margin-top: 28px;">'
            f'<h3 style="color: #334155; font-size: 15px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Prochaines étapes recommandées</h3>'
            f'<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">'
            f'<table style="width: 100%; border-collapse: collapse;">{rec_items}</table>'
            f'</div>'
            f'</div>'
        )

    dashboard_button = ""
    if dashboard_url:
        dashboard_button = (
            f'<a href="{dashboard_url}" style="display: block; background: #059669; color: white; '
            f'text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; '
            f'font-weight: 600; margin-top: 28px; font-size: 15px;">Voir le rapport complet</a>'
        )

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
        {will_pay_section}
        {escalated_section}
        {recommendations_section}
        {dashboard_button}
      </div>
      <div style="padding: 16px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; background: #f8fafc;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Recovia — {agency_name}</p>
      </div>
    </div>
    """

    will_pay_text = ""
    if will_pay_details:
        will_pay_text = "\nPromesses de paiement :\n"
        for t in will_pay_details:
            will_pay_text += f"  - {t.get('name', '—')} : {t.get('amount', 0):.0f}€ (avant le {t.get('promised_date', '—')})\n"

    escalated_text = ""
    if escalated_details:
        escalated_text = "\nCas escaladés :\n"
        for t in escalated_details:
            escalated_text += f"  - {t.get('name', '—')} : {t.get('reason', '—')}\n"

    recommendations_text = ""
    if recommendations:
        recommendations_text = "\nProchaines étapes recommandées :\n"
        for rec in recommendations:
            recommendations_text += f"  → {rec}\n"

    dashboard_text = f"\nRapport complet : {dashboard_url}\n" if dashboard_url else ""

    text = f"""Campagne terminée : {campaign_name}

Résultats :
- {total} appels effectués
- {will_pay} promesses de paiement ({success_rate}%)
- {cant_pay} en difficulté
- {refuses} refus
- {escalated} escaladés
- {no_answer} pas de réponse
- Montant récupérable : {amount_recoverable:.2f}€
{will_pay_text}{escalated_text}{recommendations_text}{dashboard_text}
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
