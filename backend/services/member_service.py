from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError


WRITE_ROLES = ("admin", "editor", "member")
ADMIN_ROLES = ("admin",)


def get_member_role(trip_id: str, user_id: str) -> str:
    db = get_db()
    member = db["members"].find_one({
        "trip_id": ObjectId(trip_id),
        "user_id": ObjectId(user_id),
        "status": "active",
    })
    return member["role"] if member else None


def is_member(trip_id: str, user_id: str) -> bool:
    db = get_db()
    return db["members"].find_one({
        "trip_id": ObjectId(trip_id),
        "user_id": ObjectId(user_id),
        "status": "active",
    }) is not None


def require_role(trip_id: str, user_id: str, allowed_roles: tuple) -> str:
    role = get_member_role(trip_id, user_id)
    if not role:
        raise AppError("Not a member of this trip", "NOT_MEMBER", 403)
    if role not in allowed_roles:
        raise AppError("You do not have permission to perform this action", "FORBIDDEN", 403)
    return role


def require_admin(trip_id: str, user_id: str):
    return require_role(trip_id, user_id, ADMIN_ROLES)


def require_editor(trip_id: str, user_id: str):
    return require_role(trip_id, user_id, WRITE_ROLES)


def can_write(role: str) -> bool:
    return role in WRITE_ROLES


def can_admin(role: str) -> bool:
    return role in ADMIN_ROLES
