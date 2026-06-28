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


def _resolve_users(db, user_ids):
    ids = list(set(user_ids))
    if not ids:
        return {}
    users = list(db["users"].find(
        {"_id": {"$in": ids}},
        {"full_name": 1, "username": 1, "profile_photo_url": 1}
    ))
    return {
        str(u["_id"]): {
            "full_name": u.get("full_name", ""),
            "username": u.get("username", ""),
            "profile_photo_url": u.get("profile_photo_url", ""),
        }
        for u in users
    }


def _resolve_trips(db, trip_ids):
    ids = list(set(trip_ids))
    if not ids:
        return {}
    trips = list(db["trips"].find(
        {"_id": {"$in": ids}},
        {"title": 1}
    ))
    return {str(t["_id"]): t["title"] for t in trips}


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

    if not activities:
        return []

    actor_ids = [a["actor_id"] for a in activities]
    trip_ids = [a["trip_id"] for a in activities]

    user_cache = _resolve_users(db, actor_ids)
    trip_cache = _resolve_trips(db, trip_ids)

    results = []
    for a in activities:
        a["_id"] = str(a["_id"])
        a["trip_id"] = str(a["trip_id"])
        a["actor_id"] = str(a["actor_id"])
        a["reference_id"] = str(a["reference_id"]) if a.get("reference_id") else None
        a["trip_name"] = trip_cache.get(a["trip_id"], "Unknown")

        actor = user_cache.get(a["actor_id"])
        a["actor"] = actor if actor else None

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

    if not activities:
        return []

    actor_ids = [a["actor_id"] for a in activities]
    user_cache = _resolve_users(db, actor_ids)

    results = []
    for a in activities:
        a["_id"] = str(a["_id"])
        a["trip_id"] = str(a["trip_id"])
        a["actor_id"] = str(a["actor_id"])
        a["reference_id"] = str(a["reference_id"]) if a.get("reference_id") else None

        actor = user_cache.get(a["actor_id"])
        a["actor"] = actor if actor else None

        results.append(a)

    return results
