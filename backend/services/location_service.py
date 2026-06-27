from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.activity_service import create_activity
from services.member_service import is_member
from services.audit_helper import log_and_audit


def create_location(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()

    if not is_member(trip_id, user_id):
        raise AppError("Not a member of this trip", "NOT_MEMBER", 403)

    location = {
        "trip_id": ObjectId(trip_id),
        "name": data["name"],
        "latitude": data["latitude"],
        "longitude": data["longitude"],
        "visit_date": data["visit_date"],
        "description": data.get("description", ""),
        "category": data.get("category", "other"),
        "google_place_id": data.get("google_place_id", ""),
        "added_by": ObjectId(user_id),
        "created_at": datetime.now(timezone.utc),
    }

    result = db["locations"].insert_one(location)
    location["_id"] = str(result.inserted_id)
    location["trip_id"] = trip_id
    location["added_by"] = user_id

    create_activity(trip_id, user_id, "location_added", f"Added a location: {data['name']}")
    log_and_audit(user_id, "PLACE_ADDED", f"Added visited place {data['name']}", trip_id)

    return location


def get_trip_locations(trip_id: str) -> list:
    db = get_db()
    locations = list(
        db["locations"].find({"trip_id": ObjectId(trip_id)}).sort("visit_date", -1)
    )
    for loc in locations:
        loc["_id"] = str(loc["_id"])
        loc["trip_id"] = str(loc["trip_id"])
        loc["added_by"] = str(loc["added_by"])
        adder = db["users"].find_one({"_id": ObjectId(loc["added_by"])}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        loc["added_by_user"] = {
            "_id": str(adder["_id"]),
            "full_name": adder["full_name"],
            "username": adder["username"],
            "profile_photo_url": adder.get("profile_photo_url", ""),
        } if adder else None
    return locations


def get_location(trip_id: str, location_id: str) -> dict:
    db = get_db()
    location = db["locations"].find_one(
        {"_id": ObjectId(location_id), "trip_id": ObjectId(trip_id)}
    )
    if not location:
        raise AppError("Location not found", "LOCATION_NOT_FOUND", 404)

    location["_id"] = str(location["_id"])
    location["trip_id"] = str(location["trip_id"])
    location["added_by"] = str(location["added_by"])
    return location


def update_location(trip_id: str, location_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    location = db["locations"].find_one(
        {"_id": ObjectId(location_id), "trip_id": ObjectId(trip_id)}
    )
    if not location:
        raise AppError("Location not found", "LOCATION_NOT_FOUND", 404)

    allowed = ["name", "latitude", "longitude", "visit_date", "description", "category", "google_place_id"]
    set_fields = {k: v for k, v in data.items() if k in allowed and v is not None}

    if set_fields:
        db["locations"].update_one(
            {"_id": ObjectId(location_id)}, {"$set": set_fields}
        )

    return get_location(trip_id, location_id)


def delete_location(trip_id: str, location_id: str, user_id: str):
    db = get_db()
    location = db["locations"].find_one(
        {"_id": ObjectId(location_id), "trip_id": ObjectId(trip_id)}
    )
    if not location:
        raise AppError("Location not found", "LOCATION_NOT_FOUND", 404)

    log_and_audit(user_id, "PLACE_DELETED", f"Removed visited place {location['name']}", trip_id)

    db["locations"].delete_one({"_id": ObjectId(location_id)})

    create_activity(trip_id, user_id, "location_removed", f"Removed a location: {location['name']}")
