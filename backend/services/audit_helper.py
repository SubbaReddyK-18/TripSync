from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from services.admin_activity_service import log_activity


def update_last_active(user_id):
    db = get_db()
    db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"lastActive": datetime.now(timezone.utc)}}
    )


def get_user_name(user_id):
    db = get_db()
    user = db["users"].find_one({"_id": ObjectId(user_id)}, {"full_name": 1, "username": 1})
    if user:
        return user.get("full_name") or user.get("username") or "Unknown"
    return "Unknown"


def get_trip_name(trip_id):
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)}, {"title": 1})
    return trip["title"] if trip else None


def log_and_audit(user_id, action_type, description, trip_id=None, trip_name=None):
    user_name = get_user_name(user_id)
    if trip_id and not trip_name:
        trip_name = get_trip_name(trip_id)
    log_activity(str(user_id), user_name, action_type, description, str(trip_id) if trip_id else None, trip_name)
    update_last_active(user_id)
