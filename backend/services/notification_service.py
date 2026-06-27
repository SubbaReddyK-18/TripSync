from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from config.database import get_db

# Notifications older than this are treated as expired / auto-dismissed
NOTIFICATION_TTL_DAYS = 10


def _expiry_cutoff() -> datetime:
    """Returns the UTC datetime 10 days ago."""
    return datetime.now(timezone.utc) - timedelta(days=NOTIFICATION_TTL_DAYS)


def create_notification(recipient_id: str, trip_id: str, type: str, message: str, reference_id: str = None, reference_type: str = None):
    try:
        db = get_db()
        notification = {
            "recipient_id": ObjectId(recipient_id),
            "trip_id": ObjectId(trip_id) if trip_id else None,
            "type": type,
            "message": message,
            "reference_id": ObjectId(reference_id) if reference_id else None,
            "reference_type": reference_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        db["notifications"].insert_one(notification)
    except Exception:
        pass


def get_notifications(user_id: str) -> list:
    db = get_db()
    cutoff = _expiry_cutoff()
    notifications = list(
        db["notifications"]
        .find({
            "recipient_id": ObjectId(user_id),
            "created_at": {"$gte": cutoff},   # only last 10 days
        })
        .sort("created_at", -1)
        .limit(50)
    )
    for n in notifications:
        n["_id"] = str(n["_id"])
        n["recipient_id"] = str(n["recipient_id"])
        n["trip_id"] = str(n["trip_id"]) if n.get("trip_id") else None
        n["reference_id"] = str(n["reference_id"]) if n.get("reference_id") else None
    return notifications


def mark_as_read(notification_id: str, user_id: str):
    db = get_db()
    cutoff = _expiry_cutoff()
    db["notifications"].update_one(
        {
            "_id": ObjectId(notification_id),
            "recipient_id": ObjectId(user_id),
            "created_at": {"$gte": cutoff},   # don't touch expired ones
        },
        {"$set": {"is_read": True}},
    )


def mark_all_as_read(user_id: str):
    db = get_db()
    cutoff = _expiry_cutoff()
    db["notifications"].update_many(
        {
            "recipient_id": ObjectId(user_id),
            "is_read": False,
            "created_at": {"$gte": cutoff},   # only affect non-expired ones
        },
        {"$set": {"is_read": True}},
    )


def get_unread_count(user_id: str) -> int:
    db = get_db()
    cutoff = _expiry_cutoff()
    return db["notifications"].count_documents({
        "recipient_id": ObjectId(user_id),
        "is_read": False,
        "created_at": {"$gte": cutoff},        # expired ones don't count
    })
