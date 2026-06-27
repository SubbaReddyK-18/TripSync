import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    smtp_host = current_app.config.get("SMTP_HOST", "")
    if not smtp_host:
        logger.warning("SMTP not configured — skipping email to %s", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = current_app.config["MAIL_FROM"]
    msg["To"] = to
    msg.attach(MIMEText(body, "plain"))

    try:
        smtp_port = current_app.config["SMTP_PORT"]
        smtp_user = current_app.config.get("SMTP_USER", "")
        smtp_pass = current_app.config.get("SMTP_PASS", "")

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            if smtp_port == 587:
                server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.sendmail(current_app.config["MAIL_FROM"], [to], msg.as_string())
        logger.info("Email sent to %s", to)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def send_otp_email(to: str, otp: str) -> bool:
    subject = "Your TripSync verification code"
    body = f"""Welcome to TripSync!

Your verification code is:

  {otp}

Enter this code on the verification screen to activate your account.

This code will expire in 10 minutes.

If you did not create an account, you can safely ignore this email.

— TripSync Team"""
    return send_email(to, subject, body)
