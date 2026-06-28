from datetime import datetime, timezone
from bson.objectid import ObjectId
from flask import g
from config.database import get_db
from middleware.error_handler import AppError
from services.auth_service import check_password, hash_password
from services.audit_helper import log_and_audit


def get_current_user() -> dict:
    return g.current_user


def update_profile(user_id: str, updates: dict) -> dict:
    db = get_db()
    allowed = ["full_name", "username", "bio", "profile_photo_url", "profile_photo_public_id"]

    if "username" in updates:
        existing = db["users"].find_one({
            "username": updates["username"],
            "_id": {"$ne": ObjectId(user_id)},
        })
        if existing:
            raise AppError("Username already taken", "DUPLICATE_USERNAME", 409)

    set_fields = {k: v for k, v in updates.items() if k in allowed and v is not None}
    if not set_fields:
        raise AppError("No valid fields to update", "NO_UPDATES", 400)

    db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": set_fields})
    log_and_audit(user_id, "PROFILE_UPDATED", "Updated profile")

    user = db["users"].find_one({"_id": ObjectId(user_id)})
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


def change_password(user_id: str, current_password: str, new_password: str):
    db = get_db()
    user = db["users"].find_one({"_id": ObjectId(user_id)})
    if not check_password(current_password, user["password_hash"]):
        raise AppError("Current password is incorrect", "INVALID_PASSWORD", 401)

    db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    log_and_audit(user_id, "PASSWORD_CHANGED", "Changed password")


def get_all_users() -> dict:
    db = get_db()
    users = db["users"].find({}, {"password_hash": 0}).sort("created_at", -1)
    results = []
    for u in users:
        u["_id"] = str(u["_id"])
        uid = ObjectId(u["_id"])

        # Trips where this user is the creator
        created_trip_ids = set(
            str(t["_id"])
            for t in db["trips"].find({"admin_id": uid}, {"_id": 1})
        )
        # Trips where this user joined as an active member
        joined_trip_ids = set(
            str(m["trip_id"])
            for m in db["members"].find({"user_id": uid, "status": "active"}, {"trip_id": 1})
        )
        # Union — unique trips (created OR joined)
        u["trip_count"] = len(created_trip_ids | joined_trip_ids)
        u["trips_created"] = len(created_trip_ids)

        if "lastActive" in u and isinstance(u.get("lastActive"), datetime):
            u["lastActive"] = u["lastActive"].replace(tzinfo=timezone.utc).isoformat()
        results.append(u)
    return {
        "users": results,
        "total_trips": db["trips"].count_documents({}),
    }


def search_users(query: str) -> list:
    db = get_db()
    regex = {"$regex": query, "$options": "i"}
    users = db["users"].find(
        {"$or": [{"username": regex}, {"full_name": regex}, {"email": regex}]},
        {"password_hash": 0},
    ).limit(20)

    results = []
    for u in users:
        u["_id"] = str(u["_id"])
        results.append(u)
    return results


def get_user_stats(user_id: str) -> dict:
    db = get_db()
    uid = ObjectId(user_id)

    # Trips created by this user
    created_trip_ids = set(
        str(t["_id"])
        for t in db["trips"].find({"admin_id": uid}, {"_id": 1})
    )
    # Trips joined as an active member
    joined_trip_ids = set(
        str(m["trip_id"])
        for m in db["members"].find({"user_id": uid, "status": "active"}, {"trip_id": 1})
    )
    trips_created = len(created_trip_ids)
    total_trips = len(created_trip_ids | joined_trip_ids)

    uid_str = str(user_id)
    expenses = list(db["expenses"].find({
        "$or": [
            {"paid_by": uid_str},
            {"paid_by": uid},
            {f"paid_by.{uid_str}": {"$exists": True}}
        ]
    }))

    expenses_added = len(expenses)
    total_expense_amount = 0
    for e in expenses:
        paid_by = e.get("paid_by")
        if isinstance(paid_by, dict):
            total_expense_amount += paid_by.get(uid_str, 0)
        else:
            total_expense_amount += e.get("amount", 0)

    places_added = db["locations"].count_documents({"created_by": uid})
    settlements = db["settlements"].count_documents({
        "$or": [{"from_user_id": uid}, {"to_user_id": uid}],
    })

    return {
        "trips_created": trips_created,
        "total_trips": total_trips,
        "expenses_added": expenses_added,
        "total_expense_amount": total_expense_amount,
        "places_added": places_added,
        "settlements": settlements,
    }


def update_user_role(user_id: str, new_role: str):
    if new_role not in ("admin", "user"):
        raise AppError("Invalid role", "INVALID_ROLE", 400)
    db = get_db()
    db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
    log_and_audit(user_id, "ROLE_CHANGED", f"Role changed to {new_role}")


def update_user_status(user_id: str, is_active: bool):
    db = get_db()
    db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": is_active}})
    log_and_audit(user_id, "USER_STATUS_CHANGED", f"User {'activated' if is_active else 'deactivated'}")
