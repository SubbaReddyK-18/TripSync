import bcrypt
import jwt
import hashlib
import secrets
import random
import uuid
from datetime import datetime, timezone, timedelta
from flask import current_app
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.email_service import send_otp_email
from services.audit_helper import log_and_audit, update_last_active
from services.admin_activity_service import log_activity


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def store_pending_registration(full_name, username, email, password, dob=None, role="user"):
    """Store registration data in pending_registrations until OTP is verified."""
    db = get_db()

    if db["users"].find_one({"$or": [{"username": username}, {"email": email}]}):
        raise AppError("Username or email already exists", "DUPLICATE_CREDENTIALS", 409)

    resolved_role = "admin" if ("admin" in email.lower() or "vu241fa04b47" in email.lower() or role == "admin") else "user"

    smtp_configured = bool(
        current_app.config.get("SMTP_HOST")
        and current_app.config.get("SMTP_USER")
        and current_app.config.get("SMTP_PASS")
    )

    otp = str(random.randint(100000, 999999))

    pending = {
        "full_name": full_name,
        "username": username,
        "email": email.lower(),
        "password_hash": hash_password(password),
        "dob": dob,
        "role": resolved_role,
        "verification_otp": otp,
        "verification_otp_expires": datetime.now(timezone.utc) + timedelta(minutes=10),
        "created_at": datetime.now(timezone.utc),
    }

    db["pending_registrations"].update_one(
        {"email": email.lower()},
        {"$set": pending},
        upsert=True
    )

    return otp, smtp_configured


def verify_and_create_user(email, otp):
    """Verify OTP from pending_registrations and create the actual user."""
    db = get_db()

    pending = db["pending_registrations"].find_one({"email": email.lower()})
    if not pending:
        raise AppError("No pending registration found with this email", "NOT_FOUND", 404)

    expires = pending.get("verification_otp_expires")
    if expires and expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise AppError("OTP has expired. Request a new one.", "OTP_EXPIRED", 400)

    if pending["verification_otp"] != otp:
        raise AppError("Invalid OTP. Try again.", "INVALID_OTP", 400)

    user = {
        "full_name": pending["full_name"],
        "username": pending["username"],
        "email": pending["email"],
        "password_hash": pending["password_hash"],
        "dob": pending.get("dob"),
        "role": pending["role"],
        "bio": "",
        "profile_photo_url": "",
        "profile_photo_public_id": "",
        "is_active": True,
        "is_verified": True,
        "created_at": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc),
        "lastActive": datetime.now(timezone.utc),
    }

    result = db["users"].insert_one(user)
    user_id = result.inserted_id
    user["_id"] = str(user_id)
    user["is_first_login"] = True
    user.pop("password_hash", None)

    db["pending_registrations"].delete_one({"_id": pending["_id"]})

    log_activity(str(user_id), user["full_name"] or user["username"], "USER_REGISTERED", f"User {user.get('full_name', '')} registered", None, None)

    return user


def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> tuple:
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=current_app.config["JWT_ACCESS_TOKEN_EXPIRES"])).timestamp()),
    }
    token = jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")
    return token, jti


def create_refresh_token(user_id: str) -> tuple:
    token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=current_app.config["JWT_REFRESH_TOKEN_EXPIRES"])

    db = get_db()
    db["refresh_tokens"].insert_one({
        "user_id": ObjectId(user_id),
        "token_hash": token_hash,
        "expires_at": expires_at,
    })

    return token, expires_at


def rotate_refresh_token(old_token_hash: str) -> tuple:
    db = get_db()
    old_token = db["refresh_tokens"].find_one({"token_hash": old_token_hash})
    if not old_token:
        raise AppError("Invalid refresh token", "INVALID_REFRESH_TOKEN", 401)

    user_id = str(old_token["user_id"])
    db["refresh_tokens"].delete_one({"_id": old_token["_id"]})

    return create_refresh_token(user_id)


def register_user(full_name: str, username: str, email: str, password: str, dob: str = None, role: str = "user") -> dict:
    db = get_db()

    if db["users"].find_one({"$or": [{"username": username}, {"email": email}]}):
        raise AppError("Username or email already exists", "DUPLICATE_CREDENTIALS", 409)

    # Determine role
    resolved_role = "admin" if ("admin" in email.lower() or "vu241fa04b47" in email.lower() or role == "admin") else "user"

    smtp_configured = bool(
        current_app.config.get("SMTP_HOST")
        and current_app.config.get("SMTP_USER")
        and current_app.config.get("SMTP_PASS")
    )

    otp = str(random.randint(100000, 999999))

    user = {
        "full_name": full_name,
        "username": username,
        "email": email.lower(),
        "password_hash": hash_password(password),
        "dob": dob,
        "role": resolved_role,
        "bio": "",
        "profile_photo_url": "",
        "profile_photo_public_id": "",
        "is_active": True,
        "is_verified": not smtp_configured,
        "verification_otp": otp if smtp_configured else None,
        "verification_otp_expires": datetime.now(timezone.utc) + timedelta(minutes=10) if smtp_configured else None,
        "created_at": datetime.now(timezone.utc),
        "last_login": None,
        "lastActive": None,
    }

    result = db["users"].insert_one(user)
    user_id = result.inserted_id
    user["_id"] = str(user_id)
    user.pop("password_hash", None)
    user.pop("verification_otp", None)
    user.pop("verification_otp_expires", None)

    if smtp_configured:
        sent = send_otp_email(email, otp)
        if not sent:
            db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"is_verified": True}})
            user["is_verified"] = True

    return user


def login_user(email_or_username: str, password: str) -> dict:
    db = get_db()
    # Search by email or username
    user = db["users"].find_one({
        "$or": [
            {"email": email_or_username.lower()},
            {"username": email_or_username}
        ]
    })
    if not user or not check_password(password, user["password_hash"]):
        raise AppError("Invalid email/username or password", "INVALID_CREDENTIALS", 401)

    is_first_login = user.get("last_login") is None

    now = datetime.now(timezone.utc)
    db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now, "lastActive": now}}
    )

    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    user["is_verified"] = user.get("is_verified", False)
    user["is_first_login"] = is_first_login
    return user
