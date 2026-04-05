"""Send email notifications via Resend.

Resend's Python SDK uses the `requests` library (synchronous), so every
call is dispatched to a thread-pool executor.
"""

import asyncio
import logging
from functools import partial

import resend

from config import config

log = logging.getLogger(__name__)

_DESCRIPTIONS: dict[str, str] = {
    "threshold": "hit your profit target",
    "profit_up": "climbed to a new profit rung",
    "profit_down": "slipped back a profit rung",
    "loss": "entered loss territory",
}


def _build_html(
    name: str,
    ticker: str,
    company_name: str,
    alert_type: str,
    close_price: float,
    profit_pct: float,
    rung_pct: float | None,
) -> str:
    sign = "+" if profit_pct >= 0 else ""
    profit_str = f"{sign}{profit_pct:.2f}%"
    description = _DESCRIPTIONS.get(alert_type, "triggered an alert")
    rung_line = (
        f'<tr><td style="padding:4px 8px 4px 0"><strong>Current rung</strong></td>'
        f"<td>{rung_pct:.0f}%</td></tr>"
        if rung_pct is not None
        else ""
    )
    color = "#c0392b" if profit_pct < 0 else "#27ae60"

    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a2e;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">StockAlert</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px">Hi {name},</p>
      <p style="margin:0 0 20px">
        <strong>{company_name} ({ticker})</strong> has <strong>{description}</strong>.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:15px">
        <tr>
          <td style="padding:4px 8px 4px 0"><strong>Closing price</strong></td>
          <td>${close_price:.2f}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0"><strong>Profit / Loss</strong></td>
          <td style="color:{color};font-weight:bold">{profit_str}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0"><strong>Alert type</strong></td>
          <td>{alert_type.replace("_", " ").title()}</td>
        </tr>
        {rung_line}
      </table>
    </div>
    <div style="padding:16px 32px;background:#f9f9f9;font-size:12px;color:#999">
      You are receiving this because email alerts are enabled for this holding.
    </div>
  </div>
</body>
</html>"""


def _sync_send(to: str, subject: str, html: str) -> None:
    if not config.RESEND_API_KEY:
        log.warning("RESEND_API_KEY not configured — skipping email to %s", to)
        return
    resend.api_key = config.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": config.RESEND_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        log.debug("Email sent to %s — %s", to, subject)
    except Exception as exc:
        log.warning("Failed to send email to %s: %s", to, exc)


async def send_alert_email(
    *,
    to: str,
    name: str,
    ticker: str,
    company_name: str,
    alert_type: str,
    close_price: float,
    profit_pct: float,
    rung_pct: float | None,
) -> None:
    """Async wrapper — dispatches to executor so the event loop is not blocked."""
    sign = "+" if profit_pct >= 0 else ""
    subject = (
        f"StockAlert: {ticker} — "
        f"{alert_type.replace('_', ' ').title()} "
        f"({sign}{profit_pct:.2f}%)"
    )
    html = _build_html(name, ticker, company_name, alert_type, close_price, profit_pct, rung_pct)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(_sync_send, to, subject, html))
