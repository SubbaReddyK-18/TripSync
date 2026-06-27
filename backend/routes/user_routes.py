from bson.objectid import ObjectId
from flask import Blueprint, request, g
from config.database import get_db
from middleware.auth_middleware import require_auth
from models.user_model import UpdateProfileSchema, ChangePasswordSchema
from services.user_service import get_current_user, update_profile, change_password, search_users, get_all_users
from middleware.error_handler import AppError
from marshmallow import ValidationError

user_bp = Blueprint("users", __name__)


@user_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    user = get_current_user()
    return {"success": True, "data": {"user": user}}


@user_bp.route("/me", methods=["PATCH"])
@require_auth
def update_me():
    schema = UpdateProfileSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    user = update_profile(g.current_user["_id"], data)
    return {"success": True, "data": {"user": user}, "message": "Profile updated"}


@user_bp.route("/me/photo", methods=["DELETE"])
@require_auth
def remove_my_photo():
    from services.cloudinary_service import delete_file

    user = get_current_user()
    public_id = user.get("profile_photo_public_id")
    if public_id:
        delete_file(public_id)

    db = get_db()
    db["users"].update_one(
        {"_id": ObjectId(g.current_user["_id"])},
        {"$unset": {"profile_photo_url": "", "profile_photo_public_id": ""}}
    )

    updated = db["users"].find_one({"_id": ObjectId(g.current_user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return {"success": True, "data": {"user": updated}, "message": "Profile photo removed"}


@user_bp.route("/me/password", methods=["PATCH"])
@require_auth
def change_my_password():
    schema = ChangePasswordSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    change_password(g.current_user["_id"], data["current_password"], data["new_password"])
    return {"success": True, "data": {}, "message": "Password changed"}


@user_bp.route("/search", methods=["GET"])
@require_auth
def search():
    query = request.args.get("q", "").strip()
    if not query or len(query) < 2:
        return {"success": True, "data": {"users": []}}

    users = search_users(query)
    return {"success": True, "data": {"users": users}}


@user_bp.route("", methods=["GET"])
@require_auth
def list_users():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)
    result = get_all_users()
    return {"success": True, "data": result}
