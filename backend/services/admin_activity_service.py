from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db


ACTION_TYPES = [
    "TRIP_CREATED", "TRIP_UPDATED", "TRIP_DELETED",
    "EXPENSE_ADDED", "EXPENSE_UPDATED", "EXPENSE_DELETED",
    "SETTLEMENT_COMPLETED",
    "MEMORY_ADDED", "MEMORY_DELETED",
    "PLACE_ADDED", "PLACE_DELETED",
    "ITINERARY_ITEM_ADDED", "ITINERARY_ITEM_UPDATED", "ITINERARY_ITEM_DELETED",
    "USER_REGISTERED",
    "PROFILE_UPDATED", "PASSWORD_CHANGED",
]


def log_activity(user_id, user_name, action_type, description, trip_id=None, trip_name=None):
    db = get_db()
    log_entry = {
        "userId": user_id,
        "userName": user_name,
        "actionType": action_type,
        "description": description,
        "tripId": trip_id,
        "tripName": trip_name,
        "createdAt": datetime.now(timezone.utc),
    }
    db["activity_logs"].insert_one(log_entry)
    return log_entry


def get_activity_logs(search=None, user_filter=None, action_filter=None, date_from=None, date_to=None, page=1, per_page=50):
    db = get_db()
    query = {}

    if search:
        query["$or"] = [
            {"userName": {"$regex": search, "$options": "i"}},
            {"tripName": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if user_filter:
        query["userId"] = user_filter
    if action_filter:
        query["actionType"] = action_filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            try:
                date_query["$gte"] = datetime.fromisoformat(date_from)
            except ValueError:
                pass
        if date_to:
            try:
                date_query["$lte"] = datetime.fromisoformat(date_to)
            except ValueError:
                pass
        if date_query:
            query["createdAt"] = date_query

    total = db["activity_logs"].count_documents(query)
    logs = list(
        db["activity_logs"].find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    for log in logs:
        log["_id"] = str(log["_id"])
        if isinstance(log.get("createdAt"), datetime):
            log["createdAt"] = log["createdAt"].replace(tzinfo=timezone.utc).isoformat()

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": -(-total // per_page),
    }


def get_action_types():
    return ACTION_TYPES
