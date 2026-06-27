import hashlib
import random
from flask import Blueprint, request, g, current_app
from datetime import datetime, timezone, timedelta
from config.database import get_db
from middleware.auth_middleware import require_auth, optional_auth
from middleware.rate_limiter import rate_limit
from middleware.config_enforcement import require_config_enabled
from models.user_model import RegisterSchema, LoginSchema
from services.auth_service import login_user, create_access_token, create_refresh_token, rotate_refresh_token, store_pending_registration, verify_and_create_user
from services.notification_service import create_notification
from services.email_service import send_otp_email
from marshmallow import ValidationError

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
@rate_limit(10, 60)
@require_config_enabled("allowRegistrations")
def register():
    schema = RegisterSchema()
    json_data = request.get_json()
    if not json_data:
        return {"success": False, "error": {"code": "INVALID_JSON", "message": "Request body must be valid JSON"}}, 400

    try:
        data = schema.load(json_data)
    except ValidationError as e:
        field_errors = []
        for field, errors in e.messages.items():
            if isinstance(errors, list):
                field_errors.append(f"{field}: {', '.join(errors)}")
            else:
                field_errors.append(f"{field}: {errors}")
        message = "; ".join(field_errors) if field_errors else "Validation failed"
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": message, "details": e.messages}}, 422

    from services.auth_service import store_pending_registration
    from services.email_service import send_otp_email

    otp, smtp_configured = store_pending_registration(
        data["full_name"],
        data["username"],
        data["email"],
        data["password"],
        dob=data.get("dob"),
        role=data.get("role", "user")
    )

    if smtp_configured:
        send_otp_email(data["email"], otp)

    return {
        "success": True,
        "data": {},
        "message": "An OTP has been sent to your email. Verify it to create your account.",
    }, 201


@auth_bp.route("/login", methods=["POST"])
@rate_limit(5, 60)
def login():
    schema = LoginSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    user = login_user(data["email"], data["password"])
    access_token, jti = create_access_token(user["_id"])
    refresh_token, _ = create_refresh_token(user["_id"])

    return {
        "success": True,
        "data": {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "message": "Login successful",
    }


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    db = get_db()
    db["token_blacklist"].insert_one({
        "jti": g.token_jti,
        "expires_at": datetime.now(timezone.utc),
    })

    auth_header = request.headers.get("Authorization", "")
    return {"success": True, "data": {}, "message": "Logged out successfully"}


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return {"success": False, "error": {"code": "MISSING_REFRESH_TOKEN", "message": "Refresh token is required"}}, 401

    token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
    db = get_db()
    stored = db["refresh_tokens"].find_one({"token_hash": token_hash})

    if not stored:
        return {"success": False, "error": {"code": "INVALID_REFRESH_TOKEN", "message": "Invalid refresh token"}}, 401

    db["refresh_tokens"].delete_one({"_id": stored["_id"]})

    user_id = str(stored["user_id"])
    access_token, jti = create_access_token(user_id)
    new_refresh_token, _ = create_refresh_token(user_id)

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
        },
        "message": "Token refreshed",
    }


@auth_bp.route("/verify-otp", methods=["POST"])
@optional_auth
def verify_otp():
    json_data = request.get_json() or {}
    email = (json_data.get("email") or "").lower()
    otp = json_data.get("otp", "")

    if not email or not otp:
        return {"success": False, "error": {"code": "MISSING_FIELDS", "message": "Email and OTP are required"}}, 400

    user = verify_and_create_user(email, otp)

    access_token, jti = create_access_token(user["_id"])
    refresh_token, _ = create_refresh_token(user["_id"])

    return {
        "success": True,
        "data": {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "message": "Email verified successfully",
    }


@auth_bp.route("/resend-otp", methods=["POST"])
@optional_auth
def resend_otp():
    json_data = request.get_json() or {}
    email = (json_data.get("email") or "").lower()

    if not email:
        return {"success": False, "error": {"code": "MISSING_EMAIL", "message": "Email is required"}}, 400

    db = get_db()
    pending = db["pending_registrations"].find_one({"email": email})
    if not pending:
        return {"success": False, "error": {"code": "NOT_FOUND", "message": "No pending registration found with this email"}}, 404

    smtp_configured = bool(
        current_app.config.get("SMTP_HOST")
        and current_app.config.get("SMTP_USER")
        and current_app.config.get("SMTP_PASS")
    )
    if not smtp_configured:
        return {"success": False, "error": {"code": "SMTP_NOT_CONFIGURED", "message": "Email service is not configured. Contact the administrator."}}, 503

    otp = str(random.randint(100000, 999999))
    db["pending_registrations"].update_one(
        {"_id": pending["_id"]},
        {"$set": {
            "verification_otp": otp,
            "verification_otp_expires": datetime.now(timezone.utc) + timedelta(minutes=10),
        }}
    )

    send_otp_email(email, otp)

    return {"success": True, "data": {}, "message": "OTP sent"}


@auth_bp.route("/admin-exists", methods=["GET"])
def admin_exists():
    db = get_db()
    admin = db["users"].find_one({"role": "admin"})
    return {
        "success": True,
        "data": {
            "exists": admin is not None
        }
    }


@auth_bp.route("/google-login", methods=["POST"])
@rate_limit(10, 60)
def google_login():
    json_data = request.get_json() or {}
    token = json_data.get("token")
    if not token:
        return {"success": False, "error": {"code": "MISSING_TOKEN", "message": "Google access token is required"}}, 400

    import requests
    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        if response.status_code != 200:
            return {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid Google token"}}, 401
        google_user = response.json()
    except Exception as e:
        return {"success": False, "error": {"code": "VERIFICATION_FAILED", "message": "Failed to verify Google token"}}, 500

    email = google_user.get("email").lower()
    picture = google_user.get("picture", "")

    db = get_db()
    user = db["users"].find_one({"email": email})

    if not user:
        return {
            "success": False,
            "error": {
                "code": "ACCOUNT_NOT_FOUND",
                "message": "No account associated with this Google email. Please register first!"
            }
        }, 404

    is_first_login = user.get("last_login") is None
    if not user.get("profile_photo_url") and picture:
        db["users"].update_one({"_id": user["_id"]}, {"$set": {"profile_photo_url": picture}})
        user["profile_photo_url"] = picture

    user_id = str(user["_id"])

    now = datetime.now(timezone.utc)
    db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now, "lastActive": now}}
    )

    from services.auth_service import create_access_token, create_refresh_token
    access_token, jti = create_access_token(user_id)
    refresh_token, _ = create_refresh_token(user_id)

    user_resp = {
        "_id": user_id,
        "full_name": user["full_name"],
        "username": user["username"],
        "email": user["email"],
        "dob": user.get("dob"),
        "role": user["role"],
        "bio": user["bio"],
        "profile_photo_url": user["profile_photo_url"],
        "is_active": user["is_active"],
        "is_verified": user["is_verified"],
        "is_first_login": is_first_login,
    }

    from services.admin_activity_service import log_activity
    log_activity(user_id, user_resp["full_name"] or user_resp["username"], "USER_LOGIN", f"User {user_resp.get('full_name', '')} logged in via Google", None, None)

    return {
        "success": True,
        "data": {
            "user": user_resp,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "message": "Successfully authenticated via Google",
    }
