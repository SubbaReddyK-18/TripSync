from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from config.database import get_db


def create_activity(trip_id: str, actor_id: str, action_type: str, description: str, reference_id: str = None, reference_type: str = None):
    try:
        db = get_db()
        activity = {
            "trip_id": ObjectId(trip_id),
            "actor_id": ObjectId(actor_id),
            "action_type": action_type,
            "description": description,
            "reference_id": ObjectId(reference_id) if reference_id else None,
            "reference_type": reference_type,
            "created_at": datetime.now(timezone.utc),
        }
        db["activity_feed"].insert_one(activity)
    except Exception:
        pass


def get_user_activity_feed(user_id: str, limit: int = 10, days: int = 7) -> list:
    db = get_db()
    query = {"actor_id": ObjectId(user_id)}
    if days is not None:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query["created_at"] = {"$gte": since}
    activities = list(
        db["activity_feed"].find(query)
        .sort("created_at", -1)
        .limit(limit)
    )
    results = []
    for a in activities:
        a["_id"] = str(a["_id"])
        a["trip_id"] = str(a["trip_id"])
        a["actor_id"] = str(a["actor_id"])
        a["reference_id"] = str(a["reference_id"]) if a.get("reference_id") else None

        trip = db["trips"].find_one({"_id": ObjectId(a["trip_id"])}, {"title": 1})
        a["trip_name"] = trip["title"] if trip else "Unknown"

        actor = db["users"].find_one({"_id": ObjectId(a["actor_id"])}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        a["actor"] = {
            "full_name": actor["full_name"],
            "username": actor["username"],
            "profile_photo_url": actor.get("profile_photo_url", ""),
        } if actor else None

        results.append(a)

    return results


def get_activity_feed(trip_id: str, limit: int = 50, days: int = 7) -> list:
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    activities = list(
        db["activity_feed"].find({
            "trip_id": ObjectId(trip_id),
            "created_at": {"$gte": since}
        })
        .sort("created_at", -1)
        .limit(limit)
    )
    results = []
    for a in activities:
        a["_id"] = str(a["_id"])
        a["trip_id"] = str(a["trip_id"])
        a["actor_id"] = str(a["actor_id"])
        a["reference_id"] = str(a["reference_id"]) if a.get("reference_id") else None

        actor = db["users"].find_one({"_id": ObjectId(a["actor_id"])}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        a["actor"] = {
            "full_name": actor["full_name"],
            "username": actor["username"],
            "profile_photo_url": actor.get("profile_photo_url", ""),
        } if actor else None

        results.append(a)

    return results
