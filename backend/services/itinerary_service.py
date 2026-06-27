from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.activity_service import create_activity
from services.member_service import is_member, require_editor
from services.audit_helper import log_and_audit


def _ensure_dt(val):
    return datetime.combine(val, datetime.min.time()) if not isinstance(val, datetime) else val


def create_item(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()

    require_editor(trip_id, user_id)

    item = {
        "trip_id": ObjectId(trip_id),
        "title": data["title"],
        "description": data.get("description", ""),
        "date": _ensure_dt(data["date"]),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
        "location": data.get("location", ""),
        "type": data.get("type", "other"),
        "notes": data.get("notes", ""),
        "booking_reference": data.get("booking_reference", ""),
        "created_by": ObjectId(user_id),
    }

    result = db["itineraries"].insert_one(item)
    item["_id"] = str(result.inserted_id)
    item["trip_id"] = trip_id
    item["created_by"] = user_id

    create_activity(trip_id, user_id, "itinerary_added", f"Added itinerary item: {data['title']}")
    log_and_audit(user_id, "ITINERARY_ITEM_ADDED", f"Added itinerary item {data['title']}", trip_id)

    return item


def get_trip_itinerary(trip_id: str) -> list:
    db = get_db()
    items = list(db["itineraries"].find({"trip_id": ObjectId(trip_id)}).sort("date", 1).sort("start_time", 1))
    for i in items:
        i["_id"] = str(i["_id"])
        i["trip_id"] = str(i["trip_id"])
        i["created_by"] = str(i["created_by"])
    return items


def get_item(trip_id: str, item_id: str) -> dict:
    db = get_db()
    item = db["itineraries"].find_one({"_id": ObjectId(item_id), "trip_id": ObjectId(trip_id)})
    if not item:
        raise AppError("Itinerary item not found", "ITEM_NOT_FOUND", 404)

    item["_id"] = str(item["_id"])
    item["trip_id"] = str(item["trip_id"])
    item["created_by"] = str(item["created_by"])
    return item


def update_item(trip_id: str, item_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    item = db["itineraries"].find_one({"_id": ObjectId(item_id), "trip_id": ObjectId(trip_id)})
    if not item:
        raise AppError("Itinerary item not found", "ITEM_NOT_FOUND", 404)

    allowed = ["title", "description", "date", "start_time", "end_time", "location", "type", "notes", "booking_reference"]
    set_fields = {}
    for k, v in data.items():
        if k in allowed and v is not None:
            set_fields[k] = _ensure_dt(v) if k == "date" else v

    if set_fields:
        db["itineraries"].update_one({"_id": ObjectId(item_id)}, {"$set": set_fields})

    log_and_audit(user_id, "ITINERARY_ITEM_UPDATED", f"Updated itinerary item {item.get('title', '')}", trip_id)

    return get_item(trip_id, item_id)


def delete_item(trip_id: str, item_id: str, user_id: str):
    db = get_db()
    item = db["itineraries"].find_one({"_id": ObjectId(item_id), "trip_id": ObjectId(trip_id)})
    if not item:
        raise AppError("Itinerary item not found", "ITEM_NOT_FOUND", 404)

    log_and_audit(user_id, "ITINERARY_ITEM_DELETED", f"Deleted itinerary item {item.get('title', '')}", trip_id)

    db["itineraries"].delete_one({"_id": ObjectId(item_id)})
