import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from flask import current_app

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = current_app.config.get("BREVO_API_KEY", "")

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email = sib_api_v3_sdk.SendSmtpEmail(
        sender={
            "email": current_app.config["MAIL_FROM"],
            "name": "TripSync"
        },
        to=[
            {
                "email": to
            }
        ],
        subject=subject,
        text_content=body
    )

    try:
        api_instance.send_transac_email(email)
        logger.info("Email sent to %s", to)
        return True
    except ApiException:
        logger.exception("Failed to send email to %s", to)
        return False
    except Exception:
        logger.exception("Unexpected error while sending email to %s", to)
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