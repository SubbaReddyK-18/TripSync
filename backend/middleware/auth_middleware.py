from functools import wraps
from flask import request, g, current_app
import jwt
from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if not token:
            return {"success": False, "error": {"code": "MISSING_TOKEN", "message": "Access token is required"}}, 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
                options={"require": ["sub", "jti", "type", "iat", "exp"]},
            )
        except jwt.ExpiredSignatureError:
            return {"success": False, "error": {"code": "TOKEN_EXPIRED", "message": "Access token has expired"}}, 401
        except jwt.InvalidTokenError:
            return {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid access token"}}, 401

        db = get_db()
        blacklisted = db["token_blacklist"].find_one({"jti": payload["jti"]})
        if blacklisted:
            return {"success": False, "error": {"code": "TOKEN_BLACKLISTED", "message": "Token has been revoked"}}, 401

        user = db["users"].find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            return {"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}}, 401

        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        user["is_verified"] = user.get("is_verified", False)
        g.current_user = user
        g.token_jti = payload["jti"]

        return f(*args, **kwargs)

    return decorated


def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if token:
            try:
                payload = jwt.decode(
                    token,
                    current_app.config["JWT_SECRET_KEY"],
                    algorithms=["HS256"],
                )
                db = get_db()
                user = db["users"].find_one({"_id": ObjectId(payload["sub"])})
                if user:
                    user["_id"] = str(user["_id"])
                    user.pop("password_hash", None)
                    user["is_verified"] = user.get("is_verified", False)
                    g.current_user = user
                    g.token_jti = payload["jti"]
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
        return f(*args, **kwargs)
    return decorated


def _extract_token():
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None
